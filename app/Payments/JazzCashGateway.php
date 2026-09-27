<?php

namespace App\Payments;

use App\Models\Payment;
use Illuminate\Support\Str;

class JazzCashGateway implements PaymentGateway
{
    public function __construct(private array $config) {}

    public function name(): string
    {
        return 'jazzcash';
    }

    public function configured(): bool
    {
        return filled($this->config['merchant_id'] ?? null)
            && filled($this->config['password'] ?? null)
            && filled($this->config['integrity_salt'] ?? null);
    }

    public function supports(string $method): bool
    {
        return $method === 'jazzcash' && $this->configured();
    }

    public function start(Payment $payment, array $input): GatewayResult
    {
        $ref = 'T'.now()->format('YmdHis').strtoupper(Str::random(5));
        $fields = [
            'pp_Version' => '1.1',
            'pp_TxnType' => 'MWALLET',
            'pp_Language' => 'EN',
            'pp_MerchantID' => $this->config['merchant_id'],
            'pp_SubMerchantID' => '',
            'pp_Password' => $this->config['password'],
            'pp_BankID' => '',
            'pp_ProductID' => '',
            'pp_TxnRefNo' => $ref,
            'pp_Amount' => (string) (int) round($payment->amount * 100),
            'pp_TxnCurrency' => 'PKR',
            'pp_TxnDateTime' => now()->format('YmdHis'),
            'pp_BillReference' => $payment->reference,
            'pp_Description' => 'GleanGrid pre-order '.$payment->reference,
            'pp_TxnExpiryDateTime' => $payment->expires_at->format('YmdHis'),
            'pp_ReturnURL' => route('payments.callback', 'jazzcash'),
            'ppmpf_1' => $input['msisdn'] ?? '',
        ];
        $fields['pp_SecureHash'] = $this->sign($fields);

        return GatewayResult::redirect($this->config['endpoint'], $fields, $ref);
    }

    public function poll(Payment $payment): GatewayResult
    {
        return GatewayResult::pending();
    }

    public function refund(Payment $payment, float $amount): GatewayResult
    {
        return GatewayResult::pending(['manual' => true]);
    }

    public function verify(array $payload): bool
    {
        $hash = (string) ($payload['pp_SecureHash'] ?? '');
        unset($payload['pp_SecureHash']);

        return $hash !== '' && hash_equals($this->sign($payload), strtoupper($hash));
    }

    public function sign(array $fields): string
    {
        ksort($fields);
        $values = collect($fields)
            ->filter(fn ($v, $k) => str_starts_with($k, 'pp') && (string) $v !== '')
            ->values()->implode('&');

        return strtoupper(hash_hmac('sha256', $this->config['integrity_salt'].'&'.$values, $this->config['integrity_salt']));
    }
}
