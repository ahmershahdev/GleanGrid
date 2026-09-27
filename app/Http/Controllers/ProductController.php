<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Market;
use App\Models\Product;
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
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$term}%")->orWhere('description', 'like', "%{$term}%")))
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

    public function show(Product $product): Response
    {
        abort_if($product->removed_at || ! $product->farmer->isApproved(), 404);

        $product->load('farmer.markets', 'category');

        return Inertia::render('Products/Show', [
            'product' => $product,
            'reviews' => $product->reviews()->where('is_hidden', false)->with('user:id,name')->latest()->limit(20)->get(),
            'related' => Product::orderable()->where('category_id', $product->category_id)->whereKeyNot($product->id)
                ->with('farmer:id,stall_name,slug')->orderByDesc('rating_avg')->limit(4)->get(),
            'moreFromFarmer' => $product->farmer->products()->orderable()->whereKeyNot($product->id)->limit(4)->get(),
        ]);
    }
}
