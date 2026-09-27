<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Market extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'address', 'city', 'latitude', 'longitude',
        'map_provider', 'operating_days', 'opens_at', 'closes_at', 'cover_image', 'is_active',
    ];

    protected $appends = ['cover_url'];

    protected function casts(): array
    {
        return [
            'operating_days' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function farmers(): BelongsToMany
    {
        return $this->belongsToMany(FarmerProfile::class, 'farmer_market')->withPivot('stall_number');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function pickupSlots(): HasMany
    {
        return $this->hasMany(PickupSlot::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOpenOn(Builder $query, int $day): Builder
    {
        return $query->whereJsonContains('operating_days', $day);
    }

    public function scopeWithDistance(Builder $query, float $lat, float $lng): Builder
    {
        return $query->select('markets.*')->selectRaw(
            '(6371 * acos(least(1, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) as distance_km',
            [$lat, $lng, $lat]
        );
    }

    public function isOpenToday(): bool
    {
        return in_array((int) now()->dayOfWeek, $this->operating_days ?? [], true);
    }

    public function getCoverUrlAttribute(): ?string
    {
        return Product::resolveImage($this->cover_image);
    }
}
