<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Payments\GatewayManager;
use App\Payments\GatewayResult;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentCallbackController extends Controller
{
    public function __invoke(Request $request, string $provider, GatewayManager $gateways, PaymentService $service): RedirectResponse
    {
        abort_unless($provider === 'jazzcash' && $gateways->live(), 404);

        $gateway = $gateways->jazzcash();
        $payload = collect($request->all())->filter(fn ($v, $k) => is_string($k) && str_starts_with($k, 'pp') && is_scalar($v))
            ->map(fn ($v) => (string) $v)->all();

        abort_unless($gateway->configured() && $gateway->verify($payload), 403);

        $payment = Payment::where('provider', 'jazzcash')->where('provider_ref', $payload['pp_TxnRefNo'] ?? '')->firstOrFail();
        abort_unless((int) ($payload['pp_Amount'] ?? 0) === (int) round($payment->amount * 100), 422);

        $result = ($payload['pp_ResponseCode'] ?? '') === '000'
            ? GatewayResult::succeeded($payload['pp_RetreivalReferenceNo'] ?? $payload['pp_TxnRefNo'])
            : GatewayResult::failed('wallet_rejected');

        $service->log($payment, 'callback', $payment->status, 'JazzCash responded '.($payload['pp_ResponseCode'] ?? '?'), null, null, $request->ip());
        $service->apply($payment, $result);

        return redirect()->route('customer.payments.show', $payment);
    }
}
