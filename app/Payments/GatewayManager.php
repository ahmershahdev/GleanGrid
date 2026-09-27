<?php

namespace App\Payments;

use App\Models\Payment;
use App\Support\Settings;

class GatewayManager
{
    public function live(): bool
    {
        return config('payments.mode') === 'live';
    }

    public function jazzcash(): JazzCashGateway
    {
        return new JazzCashGateway(config('payments.jazzcash', []));
    }

    public function for(string $method): PaymentGateway
    {
        if (! $this->live()) {
            return new SandboxGateway;
        }

        $jazzcash = $this->jazzcash();
        if ($jazzcash->supports($method)) {
            return $jazzcash;
        }

        throw new \RuntimeException("No live gateway is configured for {$method}.");
    }

    public function byName(string $name): PaymentGateway
    {
        return $name === 'jazzcash' ? $this->jazzcash() : new SandboxGateway;
    }

    public function available(): array
    {
        $methods = collect(['cash', ...Payment::METHODS])
            ->filter(fn ($m) => Settings::get("payments_{$m}_enabled"));

        if ($this->live()) {
            $methods = $methods->filter(fn ($m) => $m === 'cash' || $this->jazzcash()->supports($m));
        }

        return $methods->values()->all();
    }
}
