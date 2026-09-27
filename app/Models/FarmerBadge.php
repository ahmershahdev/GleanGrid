<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FarmerBadge extends Model
{
    public const BADGES = ['top_rated', 'reliable', 'rising_star', 'customer_favourite'];

    protected $fillable = ['farmer_profile_id', 'badge', 'source', 'locked', 'reason', 'metrics', 'awarded_by', 'awarded_at', 'revoked_at', 'revoked_by'];

    protected function casts(): array
    {
        return ['locked' => 'boolean', 'metrics' => 'array', 'awarded_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(FarmerProfile::class, 'farmer_profile_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('revoked_at');
    }
}
