<?php

namespace App\Http\Controllers\Farmer;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Notifications\PlatformNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $farmer = $request->user()->farmerProfile;

        $reviews = Review::with('user:id,name', 'reviewable')
            ->where(fn ($q) => $q
                ->where(fn ($w) => $w->where('reviewable_type', 'farmer')->where('reviewable_id', $farmer->id))
                ->orWhere(fn ($w) => $w->where('reviewable_type', 'product')->whereIn('reviewable_id', $farmer->products()->withTrashed()->pluck('id'))))
            ->when($request->query('filter') === 'unanswered', fn ($q) => $q->whereNull('farmer_reply'))
            ->latest()->paginate(15)->withQueryString()
            ->through(fn (Review $r) => [
                ...$r->toArray(),
                'subject' => $r->reviewable_type === 'farmer' ? null : $r->reviewable?->name,
            ]);

        return Inertia::render('Farmer/Reviews', [
            'reviews' => $reviews,
            'rating' => $farmer->only('rating_avg', 'rating_count'),
            'filter' => $request->query('filter'),
        ]);
    }

    public function reply(Request $request, Review $review): RedirectResponse
    {
        $farmer = $request->user()->farmerProfile;
        $owns = $review->reviewable_type === 'farmer'
            ? $review->reviewable_id === $farmer->id
            : $farmer->products()->withTrashed()->whereKey($review->reviewable_id)->exists();
        abort_unless($owns, 403);

        $data = $request->validate(['farmer_reply' => 'nullable|string|max:1500']);
        $review->update(['farmer_reply' => $data['farmer_reply'], 'replied_at' => $data['farmer_reply'] ? now() : null]);

        if ($data['farmer_reply']) {
            $review->user->notify(new PlatformNotification('review_reply', ['farmer' => $farmer->stall_name], route('customer.reviews.index')));
        }

        return back()->with('success', 'flash.reply_saved');
    }
}
