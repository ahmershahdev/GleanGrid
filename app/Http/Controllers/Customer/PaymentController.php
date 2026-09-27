<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Payments\CardDetails;
use App\Payments\GatewayManager;
use App\Payments\SandboxGateway;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Customer/Payments', [
            'payments' => $request->user()->payments()->withCount('orders')->latest('id')->paginate(15)
                ->through(fn (Payment $p) => [...$p->summary(), 'orders_count' => $p->orders_count]),
            'totals' => [
                'paid' => (float) $request->user()->payments()->whereIn('status', ['paid', 'partially_refunded', 'refunded'])->sum('amount'),
                'refunded' => (float) $request->user()->payments()->sum('refunded_amount'),
            ],
        ]);
    }

    public function show(Request $request, Payment $payment, PaymentService $service, GatewayManager $gateways): Response
    {
        $this->authorizeOwner($request, $payment);
        $payment = $service->poll($payment);

        return Inertia::render('Customer/Payment', [
            'payment' => $payment->summary(),
            'orders' => $payment->orders()->with('farmer:id,stall_name,slug,logo', 'market:id,name')->orderBy('id')->get()
                ->map(fn (Order $o) => [
                    ...$o->only('code', 'status', 'payment_status', 'total_amount', 'items_count', 'pickup_starts_at', 'pickup_ends_at'),
                    'pickup_date' => $o->pickup_date->toDateString(),
                    'farmer' => $o->farmer?->stall_name,
                    'logo' => $o->farmer?->logo_url,
                    'market' => $o->market?->name,
                ]),
            'methods' => array_values(array_diff($service->methods(), ['cash'])),
            'sandbox' => ! $gateways->live(),
            'testData' => $gateways->live() ? null : [
                'cards' => [
                    ['4242 4242 4242 4242', 'success'],
                    ['5555 5555 5555 4444', 'success'],
                    [chunk_split(SandboxGateway::DECLINED_CARD, 4, ' '), 'card_declined'],
                    [chunk_split(SandboxGateway::NO_FUNDS_CARD, 4, ' '), 'insufficient_funds'],
                ],
                'wallet_decline_suffix' => SandboxGateway::DECLINED_WALLET_SUFFIX,
                'approval_seconds' => config('payments.wallet_approval_seconds'),
            ],
            'redirect' => $request->session()->pull('payment_redirect.'.$payment->reference),
        ]);
    }

    public function pay(Request $request, Payment $payment, PaymentService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $payment);

        $data = $request->validate([
            'method' => ['required', Rule::in(Payment::METHODS)],
            'idempotency_key' => 'required|uuid',
            'card_name' => 'required_if:method,card|nullable|string|max:80',
            'card_number' => 'required_if:method,card|nullable|string|max:23',
            'card_expiry' => ['required_if:method,card', 'nullable', 'regex:/^(0[1-9]|1[0-2])\s?\/\s?(\d{2})$/'],
            'card_cvc' => 'required_if:method,card|nullable|digits_between:3,4',
            'msisdn' => ['required_if:method,easypaisa,jazzcash', 'nullable', 'regex:/^03\d{9}$/'],
        ], [
            'msisdn.regex' => 'payment.msisdn_invalid',
            'card_expiry.regex' => 'payment.expiry_invalid',
        ]);

        if ($data['method'] === 'card') {
            $this->validateCard($data);
        }

        $result = $service->start($payment, $request->user(), $data['method'], collect($data)->only('card_number', 'msisdn')->all(), $data['idempotency_key'], $request->ip());

        if ($result['redirect']) {
            $request->session()->put('payment_redirect.'.$payment->reference, $result['redirect']);
        }

        $status = $result['payment']->status;

        return redirect()->route('customer.payments.show', $payment)->with(
            $status === 'paid' ? 'success' : ($status === 'pending' && $result['payment']->failure_reason ? 'error' : 'success'),
            match (true) {
                $status === 'paid' => 'flash.payment_paid',
                $status === 'pending' && (bool) $result['payment']->failure_reason => 'payment.reason_'.$result['payment']->failure_reason,
                default => 'flash.payment_started',
            },
        );
    }

    public function status(Request $request, Payment $payment, PaymentService $service): JsonResponse
    {
        $this->authorizeOwner($request, $payment);

        return response()->json(['payment' => $service->poll($payment)->summary()]);
    }

    public function cancel(Request $request, Payment $payment, PaymentService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $payment);
        if ($payment->status === 'processing') {
            return back()->with('error', 'payment.in_progress');
        }

        $service->abandon($payment, 'Checkout cancelled by the customer.');

        return redirect()->route('customer.orders.index')->with('success', 'flash.payment_cancelled');
    }

    private function authorizeOwner(Request $request, Payment $payment): void
    {
        abort_unless($payment->user_id === $request->user()->id, 404);
    }

    private function validateCard(array $data): void
    {
        $digits = CardDetails::digits($data['card_number']);
        [$month, $year] = array_map('intval', preg_split('/\s?\/\s?/', $data['card_expiry']));
        $errors = array_filter([
            'card_number' => CardDetails::luhn($digits) ? null : 'payment.card_invalid',
            'card_expiry' => CardDetails::expired($month, $year) ? 'payment.card_expired' : null,
            'card_cvc' => CardDetails::brand($digits) === 'amex' && strlen($data['card_cvc']) !== 4 ? 'payment.cvc_invalid' : null,
        ]);

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }
}
