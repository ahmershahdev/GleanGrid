<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\SeasonalProduce;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SeasonController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $items = SeasonalProduce::active()->with('category:id,name,slug,color')->orderBy('sort_order')->orderBy('name')->get();

        $counts = Product::orderable()->get(['id', 'name'])
            ->reduce(function (array $carry, Product $p) use ($items) {
                foreach ($items as $item) {
                    if (preg_match('/\b'.preg_quote(mb_strtolower($item->search ?: $item->name), '/').'/u', mb_strtolower($p->name))) {
                        $carry[$item->id] = ($carry[$item->id] ?? 0) + 1;
                    }
                }

                return $carry;
            }, []);

        return Inertia::render('Seasons', [
            'items' => $items->map(fn (SeasonalProduce $s) => [
                ...$s->only('id', 'name', 'slug', 'image', 'months', 'peak_months', 'notes'),
                'search' => $s->search ?: $s->name,
                'category' => $s->category?->only('name', 'slug', 'color'),
                'in_stock' => $counts[$s->id] ?? 0,
            ]),
            'categories' => Category::where('is_active', true)->whereIn('id', $items->pluck('category_id')->filter())->orderBy('sort_order')->get(['id', 'name', 'slug', 'color']),
            'month' => (int) now()->month,
        ]);
    }
}
