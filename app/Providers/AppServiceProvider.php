<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Coupon;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Notifications\Channels\SafeMailChannel;
use App\Support\CleanPaginator;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MailChannel::class, SafeMailChannel::class);
        $this->app->bind(LengthAwarePaginator::class, CleanPaginator::class);
    }

    public function boot(): void
    {
        Builder::macro('searchWords', function (?string $text, callable $each) {
            foreach (array_filter(preg_split('/[\s\-]+/u', trim((string) $text))) as $word) {
                $this->where(fn ($query) => $each($query, $word));
            }

            return $this;
        });

        ResetPassword::createUrlUsing(fn ($user, string $token) => route('password.reset', $token));

        Relation::enforceMorphMap([
            'user' => User::class,
            'product' => Product::class,
            'farmer' => FarmerProfile::class,
            'market' => Market::class,
            'order' => Order::class,
            'review' => Review::class,
            'category' => Category::class,
            'announcement' => Announcement::class,
            'coupon' => Coupon::class,
            'message' => ContactMessage::class,
        ]);

        RateLimiter::for('assistant', fn (Request $request) => Limit::perMinute(20)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('contact', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perDay(20)->by($request->ip())]);
        RateLimiter::for('register', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perDay(15)->by($request->ip())]);
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('password', fn (Request $request) => [Limit::perMinute(3)->by($request->ip()), Limit::perHour(10)->by(strtolower((string) $request->input('email')))]);
        RateLimiter::for('verify', fn (Request $request) => Limit::perMinute(6)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('resend', fn (Request $request) => [Limit::perMinute(1)->by($request->user()?->id), Limit::perHour(6)->by($request->user()?->id)]);
        RateLimiter::for('search', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('cart', fn (Request $request) => Limit::perMinute(90)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('prefs', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));
        RateLimiter::for('writes', fn (Request $request) => $request->isMethodSafe()
            ? Limit::none()
            : Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('global', fn (Request $request) => $request->user()
            ? Limit::perMinute(600)->by('u:'.$request->user()->id)
            : Limit::perMinute(300)->by('ip:'.$request->ip()));

        Password::defaults(fn () => Password::min(8)->max(128)->letters()->mixedCase()->numbers()->symbols()
            ->when(app()->isProduction(), fn ($rule) => $rule->uncompromised()));

        Vite::prefetch(concurrency: 3, event: 'gg:idle');
    }
}
