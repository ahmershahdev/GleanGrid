<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Favorite extends Model
{
    /** URL-friendly aliases mapped to their morph classes. */
    public const TYPES = [
        'product' => Product::class,
        'farmer' => FarmerProfile::class,
        'market' => Market::class,
    ];

    protected $fillable = ['user_id', 'favoritable_type', 'favoritable_id', 'notify_restock'];

    protected function casts(): array
    {
        return ['notify_restock' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function favoritable(): MorphTo
    {
        return $this->morphTo();
    }
}
