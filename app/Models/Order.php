<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    public const STATUSES = ['placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled', 'no_show'];

    public const TRANSITIONS = [
        'placed' => ['accepted', 'declined'],
        'accepted' => ['ready', 'declined', 'no_show'],
        'ready' => ['completed', 'no_show'],
    ];

    public const OPEN = ['placed', 'accepted', 'ready'];

    protected $fillable = [
        'code', 'customer_id', 'farmer_profile_id', 'market_id', 'pickup_slot_id', 'pickup_date',
        'pickup_starts_at', 'pickup_ends_at', 'cutoff_at', 'status', 'subtotal', 'discount_amount', 'coupon_code', 'total_amount', 'items_count',
        'customer_note', 'farmer_note', 'payment_id', 'payment_method', 'payment_status', 'accepted_at', 'ready_at', 'completed_at', 'cancelled_at', 'declined_at', 'no_show_at', 'reminder_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'pickup_date' => 'date:Y-m-d',
            'cutoff_at' => 'datetime',
            'no_show_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
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

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function isPaidOnline(): bool
    {
        return $this->payment_method !== 'cash';
    }

    public function awaitingPayment(): bool
    {
        return $this->isPaidOnline() && $this->payment_status === 'pending';
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

    public function isEditableByCustomer(): bool
    {
        return in_array($this->status, ['placed', 'accepted'], true) && $this->cutoff_at->isFuture();
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function statusHistory(): array
    {
        return DB::table('order_status_history')->where('order_id', $this->id)
            ->orderBy('changed_at')->orderBy('id')->get(['from_status', 'to_status', 'changed_at'])
            ->map(fn ($h) => ['from' => $h->from_status, 'to' => $h->to_status, 'at' => Carbon::parse($h->changed_at)->toIso8601String()])
            ->all();
    }
}
