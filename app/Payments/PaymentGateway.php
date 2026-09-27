<?php

namespace App\Payments;

use App\Models\Payment;

interface PaymentGateway
{
    public function name(): string;

    public function supports(string $method): bool;

    public function start(Payment $payment, array $input): GatewayResult;

    public function poll(Payment $payment): GatewayResult;

    public function refund(Payment $payment, float $amount): GatewayResult;
}
