<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModerationController extends Controller
{
    public function products(Request $request): Response
    {
        $filters = $request->validate(['q' => 'nullable|string|max:80', 'removed' => 'nullable|boolean']);

        return Inertia::render('Admin/Moderation/Products', [
            'products' => Product::with('farmer:id,stall_name,slug', 'category:id,name,slug')
                ->when($filters['q'] ?? null, fn ($q, $t) => $q->where('name', 'like', "%{$t}%"))
                ->when($filters['removed'] ?? false, fn ($q) => $q->whereNotNull('removed_at'))
                ->latest()->paginate(20)->withQueryString(),
            'filters' => $filters,
        ]);
    }

    /** Remove a listing from the public catalogue (or restore it). */
    public function toggleProduct(Request $request, Product $product): RedirectResponse
    {
        if ($product->removed_at) {
            $product->update(['removed_at' => null, 'removed_reason' => null]);

            return back()->with('success', 'flash.listing_restored');
        }

        $data = $request->validate(['reason' => 'required|string|max:255']);
        $product->update(['removed_at' => now(), 'removed_reason' => $data['reason']]);

        return back()->with('success', 'flash.listing_removed');
    }

    public function reviews(Request $request): Response
    {
        $filters = $request->validate(['hidden' => 'nullable|boolean', 'max_rating' => 'nullable|integer|between:1,5']);

        return Inertia::render('Admin/Moderation/Reviews', [
            'reviews' => Review::with('user:id,name,email', 'reviewable')
                ->when($filters['hidden'] ?? false, fn ($q) => $q->where('is_hidden', true))
                ->when($filters['max_rating'] ?? null, fn ($q, $r) => $q->where('rating', '<=', $r))
                ->latest()->paginate(20)->withQueryString()
                ->through(fn (Review $r) => [...$r->toArray(), 'subject' => $r->reviewable?->stall_name ?? $r->reviewable?->name]),
            'filters' => $filters,
        ]);
    }

    public function toggleReview(Request $request, Review $review): RedirectResponse
    {
        $hide = ! $review->is_hidden;
        $review->update([
            'is_hidden' => $hide,
            'hidden_reason' => $hide ? $request->validate(['reason' => 'required|string|max:255'])['reason'] : null,
        ]);

        return back()->with('success', $hide ? 'flash.review_hidden' : 'flash.review_restored');
    }

    public function destroyReview(Review $review): RedirectResponse
    {
        $review->delete();

        return back()->with('success', 'flash.review_deleted');
    }
}
