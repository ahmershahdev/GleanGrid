<?php

namespace App\Http\Middleware;

use App\Models\Announcement;
use App\Support\BotGuard;
use App\Support\Seo;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'seo' => fn () => Seo::forRequest($request),
            'ziggy' => fn () => $request->header('X-Inertia') ? null : [...(new Ziggy)->toArray(), 'location' => $request->url()],
            'captcha' => fn () => BotGuard::clientConfig(),
            'contact' => fn () => config('gleangrid.contact'),
            'social' => fn () => config('gleangrid.social'),
            'app' => [
                'name' => config('app.name'),
                'currency' => config('gleangrid.currency'),
                'locale' => app()->getLocale(),
                'locales' => config('gleangrid.locales'),
            ],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'avatar' => $user->avatar ? asset('storage/'.$user->avatar) : null,
                    'verified' => $user->hasVerifiedEmail(),
                    'farmer_status' => $user->isFarmer() ? $user->farmerProfile?->status : null,
                    'farmer_slug' => $user->isFarmer() ? $user->farmerProfile?->slug : null,
                ] : null,
            ],
            'notifications' => fn () => $user ? [
                'unread' => $user->unreadNotifications()->count(),
                'latest' => $user->notifications()->latest()->limit(6)->get()
                    ->map(fn ($n) => ['id' => $n->id, 'data' => $n->data, 'read' => (bool) $n->read_at, 'created_at' => $n->created_at]),
            ] : null,
            'favorites' => fn () => $user?->isCustomer()
                ? $user->favorites()->get(['favoritable_type', 'favoritable_id'])
                    ->groupBy('favoritable_type')->map(fn ($g) => $g->pluck('favoritable_id'))
                : null,
            'announcements' => fn () => Announcement::visibleTo($user?->role)->latest()->limit(3)
                ->get(['id', 'title', 'body', 'level', 'created_at']),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
