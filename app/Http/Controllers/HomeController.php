<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $today = (int) now()->dayOfWeek;

        return Inertia::render('Home', [
            'stats' => [
                'farmers' => FarmerProfile::approved()->count(),
                'markets' => Market::active()->count(),
                'products' => Product::listed()->count(),
                'orders' => Order::where('status', 'completed')->count(),
            ],
            'categories' => Category::where('is_active', true)->orderBy('sort_order')
                ->withCount(['products' => fn ($q) => $q->listed()])->get(),
            'harvest' => Product::orderable()->with('farmer:id,stall_name,slug', 'category:id,name,slug,color')
                ->orderByDesc('is_featured')->orderByDesc('rating_avg')->limit(8)->get(),
            'farmers' => FarmerProfile::approved()->with('markets:id,name,slug')
                ->withCount(['products' => fn ($q) => $q->listed()])
                ->orderByDesc('rating_avg')->limit(8)->get(),
            'markets' => Market::active()->withCount(['farmers' => fn ($q) => $q->approved()])->get()
                ->map(fn (Market $m) => [...$m->only('id', 'name', 'slug', 'city', 'address', 'latitude', 'longitude', 'operating_days', 'opens_at', 'closes_at', 'farmers_count'), 'open_today' => $m->isOpenToday()]),
            'reviews' => Review::where('is_hidden', false)->where('rating', '>=', 4)->whereNotNull('comment')
                ->with('user:id,name', 'reviewable')->latest()->limit(8)->get()
                ->map(fn (Review $r) => [
                    'id' => $r->id, 'rating' => $r->rating, 'comment' => $r->comment, 'user' => $r->user->name,
                    'subject' => $r->reviewable->stall_name ?? $r->reviewable->name ?? '',
                ]),
            'today' => $today,
        ]);
    }
}
