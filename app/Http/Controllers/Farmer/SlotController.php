<?php

namespace App\Http\Controllers\Farmer;

use App\Http\Controllers\Controller;
use App\Models\PickupSlot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SlotController extends Controller
{
    public function index(Request $request): Response
    {
        $farmer = $request->user()->farmerProfile;

        return Inertia::render('Farmer/Slots', [
            'slots' => $farmer->pickupSlots()->with('market:id,name')->orderBy('day_of_week')->orderBy('starts_at')->get(),
            'markets' => $farmer->markets()->get(['markets.id', 'name', 'operating_days', 'opens_at', 'closes_at']),
            'cutoff' => $farmer->order_cutoff_hours,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->user()->farmerProfile->pickupSlots()->create($this->validated($request));

        return back()->with('success', 'flash.slot_saved');
    }

    public function update(Request $request, PickupSlot $slot): RedirectResponse
    {
        $this->authorizeSlot($request, $slot);
        $slot->update($this->validated($request));

        return back()->with('success', 'flash.slot_saved');
    }

    public function destroy(Request $request, PickupSlot $slot): RedirectResponse
    {
        $this->authorizeSlot($request, $slot);
        $slot->delete();

        return back()->with('success', 'flash.slot_deleted');
    }

    public function cutoff(Request $request): RedirectResponse
    {
        $data = $request->validate(['order_cutoff_hours' => 'required|integer|min:1|max:168']);
        $request->user()->farmerProfile->update($data);

        return back()->with('success', 'flash.cutoff_saved');
    }

    private function validated(Request $request): array
    {
        $marketIds = $request->user()->farmerProfile->markets()->pluck('markets.id');

        return $request->validate([
            'market_id' => ['required', Rule::in($marketIds)],
            'day_of_week' => 'required|integer|between:0,6',
            'starts_at' => 'required|date_format:H:i',
            'ends_at' => 'required|date_format:H:i|after:starts_at',
            'capacity' => 'required|integer|min:1|max:500',
            'is_active' => 'boolean',
        ], ['market_id.in' => 'Add this market to your stall profile first.']);
    }

    private function authorizeSlot(Request $request, PickupSlot $slot): void
    {
        abort_unless($slot->farmer_profile_id === $request->user()->farmerProfile->id, 403);
    }
}
