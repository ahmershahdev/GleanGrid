<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\DB;

class FarmerProfile extends Model
{
    protected $fillable = [
        'user_id', 'stall_name', 'slug', 'contact_person', 'phone', 'email', 'address',
        'tagline', 'bio', 'latitude', 'longitude', 'operating_days', 'order_cutoff_hours',
        'logo', 'cover_image', 'status', 'approved_at', 'status_reason',
    ];

    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'operating_days' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'approved_at' => 'datetime',
            'rating_avg' => 'float',
        ];
    }

    /** URLs use the slug, never the auto-increment id. */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markets(): BelongsToMany
    {
        return $this->belongsToMany(Market::class, 'farmer_market')->withPivot('stall_number');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function pickupSlots(): HasMany
    {
        return $this->hasMany(PickupSlot::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved')
            ->whereHas('user', fn ($q) => $q->where('status', 'active'));
    }

    public function getLogoUrlAttribute(): ?string
    {
        return Product::resolveImage($this->logo);
    }

    /**
     * Recalculate in one UPDATE ... SELECT so concurrent reviews can never
     * leave a stale average behind (no read-modify-write in PHP).
     */
    public function refreshRating(): void
    {
        $sub = Review::query()->where('reviewable_type', 'farmer')->whereColumn('reviewable_id', 'farmer_profiles.id')->where('is_hidden', false);

        static::whereKey($this->id)->update([
            'rating_avg' => DB::raw('COALESCE(('.(clone $sub)->selectRaw('ROUND(AVG(rating), 2)')->toRawSql().'), 0)'),
            'rating_count' => DB::raw('('.(clone $sub)->selectRaw('COUNT(*)')->toRawSql().')'),
        ]);
        $this->refresh();
    }
}
