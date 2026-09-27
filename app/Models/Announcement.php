<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    protected $fillable = ['user_id', 'title', 'body', 'audience', 'level', 'is_published', 'expires_at'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'expires_at' => 'datetime'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeVisibleTo(Builder $query, ?string $role): Builder
    {
        $audiences = match ($role) {
            User::ROLE_CUSTOMER => ['all', 'customers'],
            User::ROLE_FARMER => ['all', 'farmers'],
            User::ROLE_ADMIN => ['all', 'customers', 'farmers'],
            default => ['all'],
        };

        return $query->where('is_published', true)
            ->whereIn('audience', $audiences)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}
