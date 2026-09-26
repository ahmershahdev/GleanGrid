<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Review extends Model
{
    protected $fillable = [
        'user_id', 'reviewable_type', 'reviewable_id', 'order_id', 'rating', 'comment',
        'farmer_reply', 'replied_at', 'is_hidden', 'hidden_reason',
    ];

    protected function casts(): array
    {
        return ['is_hidden' => 'boolean', 'replied_at' => 'datetime', 'rating' => 'integer'];
    }

    protected static function booted(): void
    {
        static::saved(fn (Review $review) => $review->reviewable?->refreshRating());
        static::deleted(fn (Review $review) => $review->reviewable?->refreshRating());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewable(): MorphTo
    {
        return $this->morphTo();
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
