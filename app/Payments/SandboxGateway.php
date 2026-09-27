<?php

namespace App\Payments;

use App\Models\Payment;
use Illuminate\Support\Str;

class SandboxGateway implements PaymentGateway
{
    public const DECLINED_CARD = '4000000000000002';

    public const NO_FUNDS_CARD = '4000000000009995';

    public const DECLINED_WALLET_SUFFIX = '0000';

    public function name(): string
    {
        return 'sandbox';
    }

    public function supports(string $method): bool
    {
        return in_array($method, Payment::METHODS, true);
    }

    public function start(Payment $payment, array $input): GatewayResult
    {
        if ($payment->method === 'card') {
            $digits = CardDetails::digits($input['card_number'] ?? '');
            $details = ['card_brand' => CardDetails::brand($digits), 'card_last4' => substr($digits, -4)];

            return match ($digits) {
                self::DECLINED_CARD => GatewayResult::failed('card_declined', $details),
                self::NO_FUNDS_CARD => GatewayResult::failed('insufficient_funds', $details),
                default => GatewayResult::succeeded($this->ref('CRD'), $details),
            };
        }

        return GatewayResult::pending(['wallet_msisdn' => CardDetails::maskMsisdn($input['msisdn'])], $this->ref(strtoupper(substr($payment->method, 0, 3))));
    }

    public function poll(Payment $payment): GatewayResult
    {
        $started = $payment->processing_started_at;
        if (! $started || $started->diffInSeconds(now(), true) < config('payments.wallet_approval_seconds')) {
            return GatewayResult::pending();
        }

        if (str_ends_with((string) $payment->wallet_msisdn, self::DECLINED_WALLET_SUFFIX)) {
            return GatewayResult::failed('wallet_rejected');
        }

        return GatewayResult::succeeded((string) $payment->provider_ref);
    }

    public function refund(Payment $payment, float $amount): GatewayResult
    {
        return GatewayResult::succeeded($this->ref('RFD'));
    }

    private function ref(string $prefix): string
    {
        return 'SBX-'.$prefix.'-'.strtoupper(Str::random(12));
    }
}
