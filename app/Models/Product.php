<?php

namespace App\Models;

use App\Notifications\PlatformNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    use SoftDeletes;

    public const UNITS = ['kg', 'g', 'dozen', 'piece', 'bunch', 'litre', 'jar', 'loaf', 'pack', 'box'];

    protected $fillable = [
        'farmer_profile_id', 'category_id', 'name', 'slug', 'description', 'price', 'unit',
        'stock_quantity', 'weekly_quantity', 'image', 'photo', 'status', 'is_featured',
        'removed_at', 'removed_reason',
    ];

    protected $appends = ['image_url', 'photo_url'];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'is_featured' => 'boolean',
            'removed_at' => 'datetime',
            'rating_avg' => 'float',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected static function booted(): void
    {
        static::updated(function (Product $product) {
            $backInStock = $product->wasChanged('status')
                && $product->status === 'available'
                && in_array($product->getOriginal('status'), ['sold_out', 'unavailable'], true)
                && $product->stock_quantity > 0;

            if ($backInStock) {
                $product->loadMissing('farmer');
                DB::afterCommit(fn () => Favorite::with('user')->where('favoritable_type', 'product')
                    ->where('favoritable_id', $product->id)->where('notify_restock', true)->get()
                    ->each(fn (Favorite $fav) => $fav->user->notify(new PlatformNotification(
                        'restock',
                        ['product' => $product->name, 'farmer' => $product->farmer->stall_name],
                        route('products.show', $product->slug),
                        true,
                    ))));
            }
        });
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(FarmerProfile::class, 'farmer_profile_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    public function scopeListed(Builder $query): Builder
    {
        return $query->whereNull('removed_at')
            ->whereHas('farmer', fn ($q) => $q->approved());
    }

    public function scopeOrderable(Builder $query): Builder
    {
        return $query->listed()->where('status', 'available')->where('stock_quantity', '>', 0);
    }

    public function isOrderable(): bool
    {
        return $this->status === 'available' && $this->stock_quantity > 0 && $this->removed_at === null;
    }

    public function getImageUrlAttribute(): ?string
    {
        return self::resolveImage($this->image);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return self::resolveImage($this->image && ! str_starts_with($this->image, 'produce:') ? $this->image : $this->photo);
    }

    public static function resolveImage(?string $image): ?string
    {
        if (! $image) {
            return null;
        }
        if (str_starts_with($image, 'produce:')) {
            return asset('images/produce/'.substr($image, 8).'.webp');
        }
        if (str_starts_with($image, 'photo:')) {
            return asset('images/photos/'.substr($image, 6).'.webp');
        }

        return asset('storage/'.$image);
    }

    public function refreshRating(): void
    {
        $sub = Review::query()->where('reviewable_type', 'product')->whereColumn('reviewable_id', 'products.id')->where('is_hidden', false);

        static::whereKey($this->id)->update([
            'rating_avg' => DB::raw('COALESCE(('.(clone $sub)->selectRaw('ROUND(AVG(rating), 2)')->toRawSql().'), 0)'),
            'rating_count' => DB::raw('('.(clone $sub)->selectRaw('COUNT(*)')->toRawSql().')'),
        ]);
        $this->refresh();
    }
}
