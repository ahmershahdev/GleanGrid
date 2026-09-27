<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Market;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MarketController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Markets/Index', [
            'markets' => Market::withCount('farmers', 'orders')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Markets/Form');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(3));
        $market = Market::create($data);
        AuditLog::record('market.created', "Added market {$market->name}", $market);

        return redirect()->route('admin.markets.index')->with('success', 'flash.market_saved');
    }

    public function edit(Market $market): Response
    {
        return Inertia::render('Admin/Markets/Form', ['market' => $market]);
    }

    public function update(Request $request, Market $market): RedirectResponse
    {
        $market->update($this->validated($request));

        AuditLog::record('market.updated', "Edited market {$market->name}", $market);

        return redirect()->route('admin.markets.index')->with('success', 'flash.market_saved');
    }

    public function destroy(Market $market): RedirectResponse
    {
        if ($market->orders()->exists()) {
            $market->update(['is_active' => false]);
            AuditLog::record('market.deactivated', "Retired market {$market->name} (it has order history)", $market);

            return back()->with('success', 'flash.market_deactivated');
        }
        AuditLog::record('market.deleted', "Deleted market {$market->name}", null, ['id' => $market->id]);
        $market->delete();

        return back()->with('success', 'flash.market_deleted');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:2000',
            'address' => 'required|string|max:500',
            'city' => 'required|string|max:80',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'map_provider' => 'required|in:openstreetmap,google',
            'operating_days' => 'required|array|min:1',
            'operating_days.*' => 'integer|between:0,6',
            'opens_at' => 'required|date_format:H:i',
            'closes_at' => 'required|date_format:H:i|after:opens_at',
            'is_active' => 'boolean',
        ]);
    }
}
