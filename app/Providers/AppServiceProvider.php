<?php

namespace App\Providers;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Short, stable type names in polymorphic columns (favorites, reviews, notifications).
        Relation::enforceMorphMap([
            'user' => User::class,
            'product' => Product::class,
            'farmer' => FarmerProfile::class,
            'market' => Market::class,
            'order' => Order::class,
        ]);

        // Named limiters: each public write endpoint gets a budget sized to real human use.
        RateLimiter::for('assistant', fn (Request $request) => Limit::perMinute(20)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('contact', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perDay(20)->by($request->ip())]);
        RateLimiter::for('register', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perDay(15)->by($request->ip())]);
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('password', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perHour(10)->by(strtolower((string) $request->input('email')))]);
        RateLimiter::for('verify', fn (Request $request) => Limit::perMinute(6)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('resend', fn (Request $request) => [Limit::perMinute(1)->by($request->user()?->id), Limit::perHour(6)->by($request->user()?->id)]);
        RateLimiter::for('writes', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        // One password policy everywhere; production also rejects passwords seen in breaches.
        Password::defaults(fn () => Password::min(8)->max(128)->letters()->mixedCase()->numbers()->symbols()
            ->when(app()->isProduction(), fn ($rule) => $rule->uncompromised()));

        Vite::prefetch(concurrency: 3);
    }
}
