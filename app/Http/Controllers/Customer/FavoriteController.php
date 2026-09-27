<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FavoriteController extends Controller
{
    public function index(Request $request): Response
    {
        $favorites = $request->user()->favorites()->with('favoritable')->latest()->get()
            ->filter(fn (Favorite $f) => $f->favoritable !== null);

        $group = fn (string $type) => $favorites->where('favoritable_type', $type)
            ->map(fn (Favorite $f) => ['favorite_id' => $f->id, 'notify_restock' => $f->notify_restock, 'item' => $f->favoritable])->values();

        $group('product')->each(fn ($f) => $f['item']->load('farmer:id,stall_name,slug'));

        return Inertia::render('Customer/Favorites', [
            'products' => $group('product'),
            'farmers' => $group('farmer'),
            'markets' => $group('market'),
        ]);
    }

    public function toggle(Request $request, string $type, int $id): RedirectResponse
    {
        abort_unless(isset(Favorite::TYPES[$type]), 404);
        Favorite::TYPES[$type]::findOrFail($id);

        $removed = $request->user()->favorites()->where('favoritable_type', $type)->where('favoritable_id', $id)->delete();

        if ($removed) {
            return back()->with('success', 'flash.favorite_removed');
        }

        Favorite::insertOrIgnore([
            'user_id' => $request->user()->id,
            'favoritable_type' => $type,
            'favoritable_id' => $id,
            'notify_restock' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'flash.favorite_added');
    }

    public function update(Request $request, Favorite $favorite): RedirectResponse
    {
        abort_unless($favorite->user_id === $request->user()->id, 403);
        $favorite->update($request->validate(['notify_restock' => 'required|boolean']));

        return back();
    }
}
