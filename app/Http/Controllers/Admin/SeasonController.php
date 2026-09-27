<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\SeasonalProduce;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SeasonController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Seasons', [
            'items' => SeasonalProduce::with('category:id,name')->orderBy('sort_order')->orderBy('name')->get(),
            'categories' => Category::orderBy('sort_order')->get(['id', 'name']),
            'images' => collect(glob(public_path('images/produce/*.webp')) ?: [])->map(fn ($f) => basename($f, '.webp'))->sort()->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $item = SeasonalProduce::create([...$data, 'slug' => $this->slug($data['name'])]);
        AuditLog::record('season.created', "Added {$item->name} to the seasonal calendar", $item);

        return back()->with('success', 'flash.season_saved');
    }

    public function update(Request $request, SeasonalProduce $season): RedirectResponse
    {
        $data = $this->validated($request, $season);
        $season->update([...$data, 'slug' => $season->name === $data['name'] ? $season->slug : $this->slug($data['name'], $season->id)]);
        AuditLog::record('season.updated', "Updated {$season->name} on the seasonal calendar", $season);

        return back()->with('success', 'flash.season_saved');
    }

    public function destroy(SeasonalProduce $season): RedirectResponse
    {
        AuditLog::record('season.deleted', "Removed {$season->name} from the seasonal calendar", null, ['id' => $season->id]);
        $season->delete();

        return back()->with('success', 'flash.season_deleted');
    }

    private function validated(Request $request, ?SeasonalProduce $season = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('seasonal_produce', 'name')->ignore($season?->id)],
            'category_id' => 'nullable|exists:categories,id',
            'image' => ['nullable', 'string', 'max:60', 'regex:/^[a-z0-9_]+$/'],
            'months' => 'required|array|min:1|max:12',
            'months.*' => 'integer|between:1,12|distinct',
            'peak_months' => 'nullable|array|max:12',
            'peak_months.*' => 'integer|between:1,12|distinct',
            'search' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0|max:1000',
            'is_active' => 'boolean',
        ]);

        $data['months'] = collect($data['months'])->map(fn ($m) => (int) $m)->unique()->sort()->values()->all();
        $data['peak_months'] = collect($data['peak_months'] ?? [])->map(fn ($m) => (int) $m)
            ->intersect($data['months'])->unique()->sort()->values()->all();
        $data['sort_order'] ??= 0;

        return $data;
    }

    private function slug(string $name, ?int $ignore = null): string
    {
        $base = Str::slug($name) ?: 'produce';
        $slug = $base;
        $i = 2;
        while (SeasonalProduce::where('slug', $slug)->when($ignore, fn ($q) => $q->whereKeyNot($ignore))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
