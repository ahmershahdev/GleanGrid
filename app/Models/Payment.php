<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    public const METHODS = ['easypaisa', 'jazzcash', 'card'];

    public const WALLETS = ['easypaisa', 'jazzcash'];

    public const OPEN = ['pending', 'processing'];

    protected $fillable = [
        'reference', 'user_id', 'method', 'provider', 'status', 'amount', 'refunded_amount', 'currency', 'provider_ref',
        'attempts', 'card_brand', 'card_last4', 'wallet_msisdn', 'failure_reason', 'expires_at',
        'processing_started_at', 'paid_at', 'failed_at', 'refunded_at',
    ];

    protected $hidden = ['provider_ref'];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'refunded_amount' => 'float',
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'processing_started_at' => 'datetime',
            'paid_at' => 'datetime',
            'failed_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentEvent::class);
    }

    public function isWallet(): bool
    {
        return in_array($this->method, self::WALLETS, true);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN, true) && $this->expires_at->isFuture();
    }

    public function summary(): array
    {
        return [
            ...$this->only('reference', 'method', 'provider', 'status', 'amount', 'refunded_amount', 'currency', 'attempts', 'card_brand', 'card_last4', 'wallet_msisdn', 'failure_reason'),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'refunded_at' => $this->refunded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
