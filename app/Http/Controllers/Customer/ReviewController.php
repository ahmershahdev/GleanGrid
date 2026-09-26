<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Review;
use App\Notifications\PlatformNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Customer/Reviews', [
            'reviews' => $request->user()->reviews()->with('reviewable')->latest()->paginate(12)
                ->through(fn (Review $r) => [
                    ...$r->only('id', 'rating', 'comment', 'farmer_reply', 'replied_at', 'is_hidden', 'created_at', 'reviewable_type'),
                    'subject' => $r->reviewable?->stall_name ?? $r->reviewable?->name,
                    'slug' => $r->reviewable?->slug,
                ]),
        ]);
    }

    /** Review the farmer or one of the products from a completed order. */
    public function store(Request $request, Order $order): RedirectResponse
    {
        abort_unless($order->customer_id === $request->user()->id, 403);
        if ($order->status !== 'completed') {
            throw ValidationException::withMessages(['rating' => 'You can review once the order is completed.']);
        }

        $data = $request->validate([
            'type' => 'required|in:farmer,product',
            'id' => 'required|integer',
            'rating' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:1500',
        ]);

        $validTarget = $data['type'] === 'farmer'
            ? $order->farmer_profile_id === (int) $data['id']
            : $order->items()->where('product_id', $data['id'])->exists();
        abort_unless($validTarget, 422);

        $review = Review::updateOrCreate(
            ['user_id' => $request->user()->id, 'reviewable_type' => $data['type'], 'reviewable_id' => $data['id'], 'order_id' => $order->id],
            ['rating' => $data['rating'], 'comment' => $data['comment']],
        );

        $order->farmer->user->notify(new PlatformNotification('new_review', [
            'rating' => $review->rating,
            'customer' => $request->user()->name,
            'subject' => $review->reviewable->stall_name ?? $review->reviewable->name,
        ], route('farmer.reviews.index')));

        return back()->with('success', 'flash.review_saved');
    }
}
