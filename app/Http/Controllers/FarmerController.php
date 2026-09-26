<?php

namespace App\Http\Controllers;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FarmerController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:80',
            'market' => 'nullable|string|exists:markets,slug',
            'day' => 'nullable|integer|between:0,6',
            'sort' => 'nullable|in:rating,name,newest',
        ]);

        $farmers = FarmerProfile::approved()
            ->with('markets:id,name,slug')
            ->withCount(['products' => fn ($q) => $q->listed()])
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('stall_name', 'like', "%{$term}%")->orWhere('tagline', 'like', "%{$term}%")
                ->orWhereHas('products', fn ($p) => $p->listed()->where('name', 'like', "%{$term}%"))))
            ->when($filters['market'] ?? null, fn ($q, $slug) => $q->whereHas('markets', fn ($m) => $m->where('slug', $slug)))
            ->when(isset($filters['day']), fn ($q) => $q->whereHas('pickupSlots', fn ($s) => $s->where('day_of_week', $filters['day'])->where('is_active', true)))
            ->when(($filters['sort'] ?? 'rating') === 'rating', fn ($q) => $q->orderByDesc('rating_avg')->orderByDesc('rating_count'))
            ->when(($filters['sort'] ?? null) === 'name', fn ($q) => $q->orderBy('stall_name'))
            ->when(($filters['sort'] ?? null) === 'newest', fn ($q) => $q->latest('approved_at'))
            ->paginate(12)->withQueryString();

        return Inertia::render('Farmers/Index', [
            'farmers' => $farmers,
            'markets' => Market::active()->orderBy('name')->get(['id', 'name', 'slug']),
            'filters' => $filters,
        ]);
    }

    public function show(FarmerProfile $farmer, OrderService $orders): Response
    {
        abort_unless($farmer->isApproved() && $farmer->user->isActive(), 404);

        $farmer->load('markets');

        return Inertia::render('Farmers/Show', [
            'farmer' => $farmer,
            'products' => $farmer->products()->whereNull('removed_at')->with('category:id,name,slug,color')
                ->orderByRaw("status = 'available' desc")->orderBy('name')->get(),
            'reviews' => $farmer->reviews()->where('is_hidden', false)->with('user:id,name')->latest()->limit(20)->get(),
            'slots' => $orders->availableSlots($farmer),
        ]);
    }
}
