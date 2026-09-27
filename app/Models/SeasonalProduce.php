<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeasonalProduce extends Model
{
    protected $table = 'seasonal_produce';

    protected $fillable = ['name', 'slug', 'category_id', 'image', 'months', 'peak_months', 'search', 'notes', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['months' => 'array', 'peak_months' => 'array', 'is_active' => 'boolean'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function inSeason(?int $month = null): bool
    {
        return in_array($month ?? (int) now()->month, array_map('intval', $this->months ?? []), true);
    }

    public function isPeak(?int $month = null): bool
    {
        return in_array($month ?? (int) now()->month, array_map('intval', $this->peak_months ?? []), true);
    }

    public static function forProductName(string $name): ?self
    {
        $name = mb_strtolower($name);

        return static::active()->orderByRaw('CHAR_LENGTH(COALESCE(search, name)) DESC')->get()->first(function (self $s) use ($name) {
            $needle = mb_strtolower($s->search ?: $s->name);

            return preg_match('/\b'.preg_quote($needle, '/').'/u', $name) === 1;
        });
    }
}
