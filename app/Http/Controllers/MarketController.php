<?php

namespace App\Http\Controllers;

use App\Models\Market;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:80',
            'day' => 'nullable|integer|between:0,6',
            'city' => 'nullable|string|max:80',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
        ]);

        $query = Market::active()->withCount(['farmers' => fn ($q) => $q->approved()]);

        if (isset($filters['lat'], $filters['lng'])) {
            $query->withDistance((float) $filters['lat'], (float) $filters['lng'])->orderBy('distance_km');
        } else {
            $query->orderBy('name');
        }

        $markets = $query
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w->where('name', 'like', "%{$term}%")->orWhere('address', 'like', "%{$term}%")))
            ->when(isset($filters['day']), fn ($q) => $q->openOn((int) $filters['day']))
            ->when($filters['city'] ?? null, fn ($q, $city) => $q->where('city', $city))
            ->get()
            ->map(fn (Market $m) => [...$m->toArray(), 'open_today' => $m->isOpenToday(), 'distance_km' => isset($m->distance_km) ? round((float) $m->distance_km, 1) : null]);

        return Inertia::render('Markets/Index', [
            'markets' => $markets,
            'cities' => Market::active()->distinct()->orderBy('city')->pluck('city'),
            'filters' => $filters,
        ]);
    }

    public function show(Market $market): Response
    {
        abort_unless($market->is_active, 404);

        $farmers = $market->farmers()->approved()
            ->withCount(['products' => fn ($q) => $q->listed()])
            ->with(['pickupSlots' => fn ($q) => $q->where('market_id', $market->id)->where('is_active', true)->orderBy('day_of_week')])
            ->get();

        return Inertia::render('Markets/Show', [
            'market' => [...$market->toArray(), 'open_today' => $market->isOpenToday()],
            'farmers' => $farmers,
            'products' => Product::orderable()->whereIn('farmer_profile_id', $farmers->pluck('id'))
                ->with('farmer:id,stall_name,slug', 'category:id,name,slug,color')
                ->orderByDesc('rating_avg')->limit(12)->get(),
        ]);
    }
}
