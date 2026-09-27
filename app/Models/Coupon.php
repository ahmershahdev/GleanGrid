<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    public const TYPES = ['percent', 'fixed'];

    protected $fillable = [
        'farmer_profile_id', 'code', 'description', 'type', 'value', 'min_subtotal', 'max_discount',
        'usage_limit', 'per_customer_limit', 'starts_at', 'ends_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'min_subtotal' => 'float',
            'max_discount' => 'float',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    protected function setCodeAttribute(string $value): void
    {
        $this->attributes['code'] = strtoupper(trim($value));
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(FarmerProfile::class, 'farmer_profile_id');
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }

    public function discountFor(float $subtotal): float
    {
        $raw = $this->type === 'percent' ? $subtotal * $this->value / 100 : $this->value;
        if ($this->type === 'percent' && $this->max_discount) {
            $raw = min($raw, $this->max_discount);
        }

        return round(min($raw, $subtotal), 2);
    }
}
