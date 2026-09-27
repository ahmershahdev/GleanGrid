<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Market;
use App\Models\Product;
use App\Models\ProductPriceHistory;
use App\Models\SeasonalProduce;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:80',
            'category' => 'nullable|string|exists:categories,slug',
            'market' => 'nullable|string|exists:markets,slug',
            'day' => 'nullable|integer|between:0,6',
            'min' => 'nullable|numeric|min:0',
            'max' => 'nullable|numeric|min:0',
            'in_stock' => 'nullable|boolean',
            'sort' => 'nullable|in:featured,price_asc,price_desc,rating,newest,popular',
        ]);

        $products = Product::listed()
            ->with('farmer:id,stall_name,slug', 'category:id,name,slug,color')
            ->when($filters['q'] ?? null, fn ($q, $s) => $q->searchWords($s, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$term}%")->orWhere('description', 'like', "%{$term}%"))))
            ->when($filters['category'] ?? null, fn ($q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when($filters['market'] ?? null, fn ($q, $slug) => $q->whereHas('farmer.markets', fn ($m) => $m->where('slug', $slug)))
            ->when(isset($filters['day']), fn ($q) => $q->whereHas('farmer.pickupSlots', fn ($s) => $s->where('day_of_week', $filters['day'])->where('is_active', true)))
            ->when(isset($filters['min']), fn ($q) => $q->where('price', '>=', $filters['min']))
            ->when(isset($filters['max']), fn ($q) => $q->where('price', '<=', $filters['max']))
            ->when($filters['in_stock'] ?? false, fn ($q) => $q->where('status', 'available')->where('stock_quantity', '>', 0))
            ->tap(fn ($q) => match ($filters['sort'] ?? 'featured') {
                'price_asc' => $q->orderBy('price'),
                'price_desc' => $q->orderByDesc('price'),
                'rating' => $q->orderByDesc('rating_avg')->orderByDesc('rating_count'),
                'newest' => $q->latest(),
                'popular' => $q->orderByDesc('sold_count'),
                default => $q->orderByRaw("status = 'available' desc")->orderByDesc('is_featured')->orderByDesc('rating_avg'),
            })
            ->paginate(16)->withQueryString();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->select('id', 'name', 'slug', 'icon', 'color')
                ->withCount(['products as count' => fn ($q) => $q->listed()])->get(),
            'markets' => Market::active()->orderBy('name')->get(['id', 'name', 'slug']),
            'priceRange' => ['min' => (float) Product::listed()->min('price'), 'max' => (float) Product::listed()->max('price')],
            'filters' => (object) $filters,
        ]);
    }

    public function show(Request $request, Product $product): Response
    {
        abort_if($product->removed_at || ! $product->farmer->isApproved(), 404);

        $product->load('farmer.markets', 'category');
        $visible = $product->reviews()->where('is_hidden', false);
        $season = SeasonalProduce::forProductName($product->name);

        return Inertia::render('Products/Show', [
            'product' => $product,
            'reviews' => (clone $visible)->with('user:id,name', 'visiblePhotos')->latest()->limit(20)->get(),
            'reviewSummary' => [
                'distribution' => (clone $visible)->selectRaw('rating, COUNT(*) as c')->groupBy('rating')->pluck('c', 'rating'),
                'with_photos' => (clone $visible)->whereHas('visiblePhotos')->count(),
            ],
            'priceHistory' => fn () => self::priceHistory($product),
            'season' => $season ? [
                ...$season->only('name', 'slug', 'months', 'peak_months', 'notes'),
                'in_season' => $season->inSeason(),
                'is_peak' => $season->isPeak(),
            ] : null,
            'alerting' => (bool) $request->user()?->stockAlerts()->where('product_id', $product->id)->whereNull('notified_at')->exists(),
            'related' => Product::orderable()->where('category_id', $product->category_id)->whereKeyNot($product->id)
                ->with('farmer:id,stall_name,slug')->orderByDesc('rating_avg')->limit(4)->get(),
            'moreFromFarmer' => $product->farmer->products()->orderable()->whereKeyNot($product->id)->limit(4)->get(),
        ]);
    }

    public static function priceHistory(Product $product, int $days = 180): array
    {
        $points = ProductPriceHistory::where('product_id', $product->id)
            ->where('recorded_on', '>=', now()->subDays($days)->toDateString())
            ->orderBy('recorded_on')->get(['recorded_on', 'price'])
            ->map(fn ($p) => ['date' => $p->recorded_on->toDateString(), 'price' => $p->price]);

        $last = $points->last();
        if (! $last || $last['date'] !== now()->toDateString()) {
            $points->push(['date' => now()->toDateString(), 'price' => $product->price]);
        }

        $prices = $points->pluck('price');
        $monthAgo = $points->filter(fn ($p) => $p['date'] <= now()->subDays(30)->toDateString())->last() ?? $points->first();
        $recent = $points->filter(fn ($p) => $p['date'] >= now()->subDays(30)->toDateString())->pluck('price');

        return [
            'points' => $points->values(),
            'min' => (float) $prices->min(),
            'max' => (float) $prices->max(),
            'avg_30' => round((float) ($recent->avg() ?? $product->price), 2),
            'change_30' => $monthAgo && $monthAgo['price'] > 0 ? round(($product->price - $monthAgo['price']) / $monthAgo['price'] * 100, 1) : 0.0,
        ];
    }
}
