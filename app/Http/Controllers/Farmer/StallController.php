<?php

namespace App\Http\Controllers\Farmer;

use App\Http\Controllers\Controller;
use App\Models\Market;
use App\Support\ImageUpload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StallController extends Controller
{
    public function edit(Request $request): Response
    {
        $farmer = $request->user()->farmerProfile->load('markets:id');

        return Inertia::render('Farmer/Stall', [
            'stall' => [
                ...$farmer->toArray(),
                'market_ids' => $farmer->markets->pluck('id'),
                'stall_numbers' => $farmer->markets->mapWithKeys(fn ($m) => [$m->id => $m->pivot->stall_number]),
            ],
            'markets' => Market::active()->orderBy('name')->get(['id', 'name', 'address', 'latitude', 'longitude', 'operating_days']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $farmer = $request->user()->farmerProfile;
        $data = $request->validate([
            'stall_name' => 'required|string|max:120',
            'contact_person' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'email' => 'required|email|max:100',
            'address' => 'required|string|max:500',
            'tagline' => 'nullable|string|max:160',
            'bio' => 'nullable|string|max:3000',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'operating_days' => 'array',
            'operating_days.*' => 'integer|between:0,6',
            'market_ids' => 'array',
            'market_ids.*' => 'integer|exists:markets,id',
            'stall_numbers' => 'array',
            'logo' => ['nullable', ...ImageUpload::RULES],
            'remove_logo' => 'boolean',
        ]);

        if ($request->hasFile('logo')) {
            ImageUpload::delete($farmer->logo);
            $data['logo'] = ImageUpload::store($request->file('logo'), 'logos', 'logo', maxSide: 640);
        } elseif ($request->boolean('remove_logo')) {
            ImageUpload::delete($farmer->logo);
            $data['logo'] = null;
        } else {
            unset($data['logo']);
        }
        unset($data['remove_logo']);

        $farmer->update(collect($data)->except('market_ids', 'stall_numbers')->all());
        $farmer->markets()->sync(collect($data['market_ids'] ?? [])->mapWithKeys(fn ($id) => [
            $id => ['stall_number' => $data['stall_numbers'][$id] ?? null],
        ]));

        return back()->with('success', 'flash.stall_saved');
    }
}
