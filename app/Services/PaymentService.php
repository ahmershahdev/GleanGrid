<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Payments\GatewayManager;
use App\Payments\GatewayResult;
use App\Support\Settings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PaymentService
{
    public function __construct(private GatewayManager $gateways) {}

    public function methods(): array
    {
        return $this->gateways->available();
    }

    public function open(User $user, Collection $orders, string $method): Payment
    {
        $payment = Payment::create([
            'reference' => $this->newReference(),
            'user_id' => $user->id,
            'method' => $method,
            'provider' => $this->gateways->for($method)->name(),
            'status' => 'pending',
            'amount' => round($orders->sum('total_amount'), 2),
            'currency' => config('payments.currency'),
            'expires_at' => now()->addMinutes(Settings::get('payment_window_minutes')),
        ]);

        Order::whereIn('id', $orders->pluck('id'))->update([
            'payment_id' => $payment->id,
            'payment_method' => $method,
            'payment_status' => 'pending',
        ]);
        $this->log($payment, 'created', 'pending', 'Checkout of '.$orders->count().' order(s): '.$orders->pluck('code')->implode(', '), $user->id);

        return $payment;
    }

    public function start(Payment $payment, User $user, string $method, array $input, string $key, ?string $ip = null): array
    {
        if (! in_array($method, $this->methods(), true) || $method === 'cash') {
            throw ValidationException::withMessages(['method' => 'payment.method_unavailable']);
        }

        $fresh = DB::transaction(function () use ($payment, $user, $method, $key, $ip) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->user_id === $user->id, 404);

            if (PaymentEvent::where('payment_id', $locked->id)->where('idempotency_key', $key)->exists()) {
                return false;
            }
            if ($locked->status === 'processing') {
                throw ValidationException::withMessages(['payment' => 'payment.in_progress']);
            }
            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages(['payment' => 'payment.not_pending']);
            }
            if ($locked->expires_at->isPast()) {
                throw ValidationException::withMessages(['payment' => 'payment.expired']);
            }
            if ($locked->attempts >= config('payments.max_attempts')) {
                throw ValidationException::withMessages(['payment' => 'payment.too_many_attempts']);
            }

            $this->log($locked, 'attempt', 'processing', 'Attempt '.($locked->attempts + 1)." via {$method}", $user->id, $key, $ip);
            $locked->update([
                'status' => 'processing',
                'method' => $method,
                'provider' => $this->gateways->for($method)->name(),
                'attempts' => $locked->attempts + 1,
                'processing_started_at' => now(),
                'failure_reason' => null,
            ]);
            Order::where('payment_id', $locked->id)->update(['payment_method' => $method]);

            return true;
        }, attempts: 3);

        if ($fresh === false) {
            return ['payment' => $payment->fresh(), 'redirect' => null];
        }

        try {
            $result = $this->gateways->for($method)->start($payment->fresh(), $input);
        } catch (Throwable $e) {
            report($e);
            $result = GatewayResult::failed('gateway_error');
        }

        return ['payment' => $this->apply($payment, $result), 'redirect' => $result->redirect];
    }

    public function poll(Payment $payment): Payment
    {
        if ($payment->status !== 'processing') {
            return $payment;
        }

        $timedOut = $payment->processing_started_at?->lt(now()->subMinutes(config('payments.processing_timeout_minutes')));
        try {
            $result = $timedOut ? GatewayResult::failed('timeout') : $this->gateways->byName($payment->provider)->poll($payment);
        } catch (Throwable $e) {
            report($e);

            return $payment;
        }

        return $result->status === GatewayResult::PENDING ? $payment : $this->apply($payment, $result);
    }

    public function apply(Payment $payment, GatewayResult $result): Payment
    {
        $late = false;

        $updated = DB::transaction(function () use ($payment, $result, &$late) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'processing') {
                $late = $result->status === GatewayResult::SUCCEEDED && in_array($locked->status, ['expired', 'failed'], true);

                return $locked;
            }

            match ($result->status) {
                GatewayResult::SUCCEEDED => $this->markPaid($locked, $result),
                GatewayResult::FAILED => $this->markFailed($locked, $result),
                default => $locked->update(array_filter([
                    'provider_ref' => $locked->provider_ref ?? $result->providerRef,
                    ...$result->details,
                ], fn ($v) => $v !== null)),
            };

            return $locked->fresh();
        }, attempts: 3);

        if ($late) {
            $this->refundLateCapture($updated, $result);
        }

        return $updated;
    }

    public function abandon(Payment $payment, string $reason, string $status = 'expired'): bool
    {
        $orders = app(OrderService::class);

        $done = DB::transaction(function () use ($payment, $reason, $status, $orders) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if (! in_array($locked->status, Payment::OPEN, true)) {
                return false;
            }

            $locked->update(['status' => $status, 'failed_at' => now(), 'failure_reason' => Str::limit($reason, 150)]);
            foreach ($locked->orders()->where('payment_status', 'pending')->orderBy('id')->get() as $order) {
                $orders->releaseUnpaid($order, $reason);
            }
            $this->log($locked, $status, $status, $reason);

            return true;
        }, attempts: 3);

        if ($done) {
            $payment->refresh()->load('user');
            $payment->user?->notify(new PlatformNotification('payment_expired', [
                'reference' => $payment->reference,
                'amount' => number_format($payment->amount),
            ], route('customer.orders.index'), true));
        }

        return $done;
    }

    public function refundOrder(Order $order, string $reason): void
    {
        if (! $order->payment_id || $order->payment_status !== 'paid') {
            return;
        }
        if (! Order::whereKey($order->id)->where('payment_status', 'paid')->update(['payment_status' => 'refunded'])) {
            return;
        }

        $payment = Payment::whereKey($order->payment_id)->lockForUpdate()->firstOrFail();
        $amount = round(min((float) $order->total_amount, $payment->amount - $payment->refunded_amount), 2);
        if ($amount <= 0) {
            return;
        }

        $result = $this->gateways->byName($payment->provider)->refund($payment, $amount);
        $refunded = round($payment->refunded_amount + $amount, 2);
        $payment->update([
            'refunded_amount' => $refunded,
            'status' => $refunded >= $payment->amount - 0.001 ? 'refunded' : 'partially_refunded',
            'refunded_at' => now(),
        ]);

        $manual = ($result->details['manual'] ?? false) ? ' (settle manually in the merchant portal)' : '';
        $this->log($payment, 'refund', $payment->status, "Refunded Rs {$amount} for {$order->code}{$manual} — {$reason}");

        $payment->user?->notify(new PlatformNotification('payment_refunded', [
            'code' => $order->code,
            'amount' => number_format($amount),
            'method' => $payment->method,
        ], route('customer.orders.show', $order), true));
    }

    public function expireStale(): int
    {
        $count = 0;
        Payment::where('status', 'pending')->where('expires_at', '<', now())->orderBy('id')->limit(200)->get()
            ->each(function (Payment $p) use (&$count) {
                $count += (int) $this->abandon($p, 'Payment window closed before the payment was completed.');
            });

        Payment::where('status', 'processing')->where('processing_started_at', '<', now()->subMinutes(config('payments.processing_timeout_minutes')))
            ->orderBy('id')->limit(200)->get()
            ->each(function (Payment $p) use (&$count) {
                $p = $this->poll($p);
                if ($p->status === 'pending' && $p->expires_at->isPast()) {
                    $count += (int) $this->abandon($p, 'Payment window closed before the payment was completed.');
                }
            });

        return $count;
    }

    public function log(Payment $payment, string $type, string $status, ?string $message = null, ?int $userId = null, ?string $key = null, ?string $ip = null): void
    {
        PaymentEvent::create([
            'payment_id' => $payment->id,
            'user_id' => $userId,
            'type' => $type,
            'status' => $status,
            'message' => $message ? Str::limit($message, 185) : null,
            'idempotency_key' => $key,
            'ip_address' => $ip,
        ]);
    }

    private function markPaid(Payment $payment, GatewayResult $result): void
    {
        $payment->update([
            ...array_filter($result->details, fn ($v) => $v !== null),
            'status' => 'paid',
            'paid_at' => now(),
            'provider_ref' => $result->providerRef ?? $payment->provider_ref,
            'failure_reason' => null,
        ]);

        Order::where('payment_id', $payment->id)->where('payment_status', 'pending')->update(['payment_status' => 'paid']);
        $this->log($payment, 'captured', 'paid', 'Captured Rs '.number_format($payment->amount));

        $orders = $payment->orders()->with('farmer.user', 'market')->get();
        foreach ($orders as $order) {
            $params = ['code' => $order->code, 'date' => $order->pickup_date->toDateString(), 'farmer' => $order->farmer->stall_name, 'market' => $order->market->name];
            $order->farmer->user->notify(new PlatformNotification('order_placed', $params, route('farmer.orders.show', $order), true));
        }
        $payment->user->notify(new PlatformNotification('payment_received', [
            'reference' => $payment->reference,
            'amount' => number_format($payment->amount),
            'method' => $payment->method,
            'codes' => $orders->pluck('code')->implode(', '),
        ], route('customer.orders.index'), true));
    }

    private function markFailed(Payment $payment, GatewayResult $result): void
    {
        $final = $payment->attempts >= config('payments.max_attempts');
        $payment->update([
            ...array_filter($result->details, fn ($v) => $v !== null),
            'status' => 'pending',
            'failure_reason' => $result->message,
            'processing_started_at' => null,
        ]);
        $this->log($payment, 'declined', $final ? 'failed' : 'pending', $result->message);

        if ($final) {
            DB::afterCommit(fn () => $this->abandon($payment, 'Too many failed payment attempts.', 'failed'));
        }
    }

    private function refundLateCapture(Payment $payment, GatewayResult $result): void
    {
        $this->log($payment, 'late_capture', $payment->status, 'Gateway confirmed after the window closed; refunding automatically. Ref '.$result->providerRef);
        $this->gateways->byName($payment->provider)->refund($payment, $payment->amount);
        Payment::whereKey($payment->id)->update(['refunded_amount' => $payment->amount, 'refunded_at' => now(), 'status' => 'refunded']);
    }

    private function newReference(): string
    {
        do {
            $ref = 'PAY-'.strtoupper(Str::random(10));
        } while (Payment::where('reference', $ref)->exists());

        return $ref;
    }
}
