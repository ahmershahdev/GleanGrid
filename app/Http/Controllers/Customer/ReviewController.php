<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Review;
use App\Models\ReviewPhoto;
use App\Notifications\PlatformNotification;
use App\Support\ImageUpload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Customer/Reviews', [
            'reviews' => $request->user()->reviews()->with('reviewable', 'photos')->latest()->paginate(12)
                ->through(fn (Review $r) => [
                    ...$r->only('id', 'rating', 'comment', 'farmer_reply', 'replied_at', 'is_hidden', 'created_at', 'reviewable_type'),
                    'photos' => $r->photos,
                    'subject' => $r->reviewable?->stall_name ?? $r->reviewable?->name,
                    'slug' => $r->reviewable?->slug,
                ]),
        ]);
    }

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
            'photos' => 'nullable|array|max:'.ReviewPhoto::MAX_PER_REVIEW,
            'photos.*' => ImageUpload::RULES,
        ]);

        $validTarget = $data['type'] === 'farmer'
            ? $order->farmer_profile_id === (int) $data['id']
            : $order->items()->where('product_id', $data['id'])->exists();
        abort_unless($validTarget, 422);

        $stored = collect($request->file('photos', []))->map(fn ($file) => [
            'path' => ImageUpload::store($file, 'reviews', 'photos', maxSide: 1400, quality: 80),
            'size' => @getimagesize($file->getRealPath()) ?: [null, null],
        ]);

        $review = DB::transaction(function () use ($request, $data, $order, $stored) {
            $review = Review::updateOrCreate(
                ['user_id' => $request->user()->id, 'reviewable_type' => $data['type'], 'reviewable_id' => $data['id'], 'order_id' => $order->id],
                ['rating' => $data['rating'], 'comment' => $data['comment']],
            );

            if ($stored->isNotEmpty()) {
                $review->photos()->get()->each(function (ReviewPhoto $photo) {
                    DB::afterCommit(fn () => ImageUpload::delete($photo->path));
                    $photo->delete();
                });
                $stored->values()->each(fn ($p, $i) => $review->photos()->create([
                    'path' => $p['path'],
                    'width' => $p['size'][0] ? min(65535, (int) $p['size'][0]) : null,
                    'height' => $p['size'][1] ? min(65535, (int) $p['size'][1]) : null,
                    'sort' => $i,
                ]));
            }

            return $review;
        });

        $order->farmer->user->notify(new PlatformNotification('new_review', [
            'rating' => $review->rating,
            'customer' => $request->user()->name,
            'subject' => $review->reviewable->stall_name ?? $review->reviewable->name,
        ], route('farmer.reviews.index')));

        return back()->with('success', 'flash.review_saved');
    }
}
