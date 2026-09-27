<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewPhoto extends Model
{
    public const MAX_PER_REVIEW = 4;

    protected $fillable = ['review_id', 'path', 'width', 'height', 'sort', 'is_hidden'];

    protected $appends = ['url'];

    protected $hidden = ['path'];

    protected function casts(): array
    {
        return ['is_hidden' => 'boolean', 'width' => 'integer', 'height' => 'integer'];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function getUrlAttribute(): string
    {
        return Product::resolveImage($this->path);
    }
}
