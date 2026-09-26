<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    public const STATUSES = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled'];

    /** Farmer-driven status transitions. */
    public const TRANSITIONS = [
        'placed' => ['accepted', 'declined'],
        'accepted' => ['ready', 'declined'],
        'ready' => ['completed'],
    ];

    /** Orders in these states still hold stock and count as revenue-in-progress. */
    public const OPEN = ['placed', 'accepted', 'ready'];

    protected $fillable = [
        'code', 'customer_id', 'farmer_profile_id', 'market_id', 'pickup_slot_id', 'pickup_date',
        'pickup_starts_at', 'pickup_ends_at', 'cutoff_at', 'status', 'subtotal', 'discount_amount', 'coupon_code', 'total_amount', 'items_count',
        'customer_note', 'farmer_note', 'accepted_at', 'ready_at', 'completed_at', 'cancelled_at', 'declined_at',
    ];

    protected function casts(): array
    {
        return [
            'pickup_date' => 'date:Y-m-d',
            'cutoff_at' => 'datetime',
            'accepted_at' => 'datetime',
            'ready_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'declined_at' => 'datetime',
            'total_amount' => 'float',
            'subtotal' => 'float',
            'discount_amount' => 'float',
        ];
    }

    /** URLs use the order code (GG-7K2M9Q), never the auto-increment id. */
    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public function couponRedemption(): HasOne
    {
        return $this->hasOne(CouponRedemption::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(FarmerProfile::class, 'farmer_profile_id');
    }

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(PickupSlot::class, 'pickup_slot_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Customers may modify or cancel only while the order is open and before the farmer's cut-off. */
    public function isEditableByCustomer(): bool
    {
        return in_array($this->status, ['placed', 'accepted'], true) && $this->cutoff_at->isFuture();
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }
}
