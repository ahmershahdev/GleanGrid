<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialAccount extends Model
{
    public const PROVIDERS = ['google', 'facebook'];

    protected $fillable = ['user_id', 'provider', 'provider_user_id', 'email', 'last_used_at'];

    protected $hidden = ['provider_user_id'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
