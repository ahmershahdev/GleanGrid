<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\Customer;
use App\Http\Controllers\Farmer;
use App\Http\Controllers\FarmerController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MarketController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PaymentCallbackController;
use App\Http\Controllers\PreferenceController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ResendWebhookController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SeasonController;
use App\Http\Controllers\SitemapController;
use App\Support\PathFilters;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('/markets/{filters?}', [MarketController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('markets.index');
Route::get('/markets/{market:slug}', [MarketController::class, 'show'])->name('markets.show');
Route::get('/farmers/{filters?}', [FarmerController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('farmers.index');
Route::get('/farmers/{farmer:slug}', [FarmerController::class, 'show'])->name('farmers.show');
Route::get('/products/{filters?}', [ProductController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('products.index');
Route::get('/products/{product:slug}', [ProductController::class, 'show'])->name('products.show');
Route::get('/seasonal-calendar', SeasonController::class)->name('seasons');
Route::get('/about', [PageController::class, 'about'])->name('about');
Route::get('/contact', [PageController::class, 'contact'])->name('contact');
Route::get('/faq', [PageController::class, 'faq'])->name('faq');
Route::get('/terms', [PageController::class, 'legal'])->defaults('page', 'terms')->name('terms');
Route::get('/privacy', [PageController::class, 'legal'])->defaults('page', 'privacy')->name('privacy');
Route::get('/returns', [PageController::class, 'legal'])->defaults('page', 'returns')->name('returns');
Route::get('/pickup-policy', [PageController::class, 'legal'])->defaults('page', 'pickup')->name('pickup-policy');
Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');
Route::post('/search/suggest', SearchController::class)->middleware('throttle:search')->name('search.suggest');

Route::post('/webhooks/resend/inbound', ResendWebhookController::class)->middleware('throttle:60,1')->name('webhooks.resend');
Route::post('/payments/callback/{provider}', PaymentCallbackController::class)->where('provider', 'jazzcash')->middleware('throttle:60,1')->name('payments.callback');
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])->where('provider', 'google|facebook')->middleware('throttle:oauth')->name('social.callback');
Route::post('/contact', [PageController::class, 'sendContact'])->middleware('throttle:contact')->name('contact.send');
Route::get('/cart', [CartController::class, 'show'])->name('cart');
Route::post('/cart/sync', [CartController::class, 'sync'])->middleware('throttle:cart')->name('cart.sync');
Route::post('/assistant', AssistantController::class)->middleware('throttle:assistant')->name('assistant');
Route::post('/preferences/locale', [PreferenceController::class, 'locale'])->middleware('throttle:prefs')->name('preferences.locale');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::get('/register/{as?}', [AuthController::class, 'showRegister'])->where('as', 'customer|farmer')->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::get('/forgot-password', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'email'])->middleware('throttle:password')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'reset'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])->middleware('throttle:password')->name('password.update');
    Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])->where('provider', 'google|facebook')->middleware('throttle:oauth')->name('social.redirect');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/verify-email', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::post('/verify-email', [EmailVerificationController::class, 'verify'])->middleware('throttle:verify')->name('verification.verify');
    Route::post('/verify-email/resend', [EmailVerificationController::class, 'resend'])->middleware('throttle:resend')->name('verification.resend');
    Route::get('/dashboard', fn () => redirect()->route(auth()->user()->dashboardRoute()))->middleware('onboarded')->name('dashboard');

    Route::get('/welcome/complete-profile', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/welcome/complete-profile', [OnboardingController::class, 'store'])->middleware('throttle:writes')->name('onboarding.store');
    Route::get('/account/connections/{provider}/link', [SocialAuthController::class, 'link'])->where('provider', 'google|facebook')->middleware('throttle:oauth')->name('social.link');
    Route::delete('/account/connections/{provider}', [SocialAuthController::class, 'unlink'])->where('provider', 'google|facebook')->middleware('throttle:password')->name('social.unlink');

    Route::get('/account/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/account/profile', [ProfileController::class, 'update'])->middleware('throttle:writes')->name('profile.update');
    Route::put('/account/password', [ProfileController::class, 'password'])->middleware('throttle:password')->name('profile.password');
    Route::delete('/account/sessions', [ProfileController::class, 'destroyOtherSessions'])->middleware('throttle:password')->name('profile.sessions.destroy');
    Route::get('/account/export', [ProfileController::class, 'export'])->middleware('throttle:6,1')->name('profile.export');
    Route::delete('/account', [ProfileController::class, 'destroy'])->middleware('throttle:password')->name('profile.destroy');

    Route::get('/account/notifications/{filters?}', [NotificationController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('notifications.index');
    Route::post('/account/notifications/read-all', [NotificationController::class, 'readAll'])->middleware('throttle:writes')->name('notifications.read-all');
    Route::post('/account/notifications/{id}/read', [NotificationController::class, 'read'])->middleware('throttle:writes')->name('notifications.read');

    Route::middleware(['role:customer', 'verified', 'onboarded', 'throttle:writes'])->prefix('account')->name('customer.')->group(function () {
        Route::get('/', Customer\DashboardController::class)->name('dashboard');
        Route::get('/checkout', [Customer\CheckoutController::class, 'show'])->name('checkout');
        Route::post('/checkout/coupon', [CouponController::class, 'preview'])->middleware('throttle:20,1')->name('coupons.preview');
        Route::post('/checkout', [Customer\CheckoutController::class, 'store'])->name('checkout.store');
        Route::get('/orders/{filters?}', [Customer\OrderController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('orders.index');
        Route::get('/orders/{order}', [Customer\OrderController::class, 'show'])->name('orders.show');
        Route::get('/orders/{order}/edit', [Customer\OrderController::class, 'edit'])->name('orders.edit');
        Route::put('/orders/{order}', [Customer\OrderController::class, 'update'])->name('orders.update');
        Route::post('/orders/{order}/cancel', [Customer\OrderController::class, 'cancel'])->name('orders.cancel');
        Route::post('/orders/{order}/reviews', [Customer\ReviewController::class, 'store'])->middleware('throttle:reviews')->name('reviews.store');
        Route::get('/payments', [Customer\PaymentController::class, 'index'])->name('payments.index');
        Route::get('/payments/{payment}', [Customer\PaymentController::class, 'show'])->name('payments.show');
        Route::post('/payments/{payment}/pay', [Customer\PaymentController::class, 'pay'])->middleware('throttle:payments')->name('payments.pay');
        Route::get('/payments/{payment}/status', [Customer\PaymentController::class, 'status'])->middleware('throttle:payment-poll')->name('payments.status');
        Route::post('/payments/{payment}/cancel', [Customer\PaymentController::class, 'cancel'])->name('payments.cancel');
        Route::post('/stock-alerts/{product:id}', [Customer\StockAlertController::class, 'store'])->middleware('throttle:alerts')->name('alerts.store');
        Route::delete('/stock-alerts/{product:id}', [Customer\StockAlertController::class, 'destroy'])->middleware('throttle:alerts')->name('alerts.destroy');
        Route::get('/reviews/{filters?}', [Customer\ReviewController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('reviews.index');
        Route::get('/favorites', [Customer\FavoriteController::class, 'index'])->name('favorites.index');
        Route::post('/favorites/{type}/{id}', [Customer\FavoriteController::class, 'toggle'])->name('favorites.toggle');
        Route::patch('/favorites/{favorite}', [Customer\FavoriteController::class, 'update'])->name('favorites.update');
        Route::get('/family', [Customer\FamilyController::class, 'index'])->name('family.index');
        Route::post('/family', [Customer\FamilyController::class, 'invite'])->name('family.invite');
        Route::post('/family/{link}/accept', [Customer\FamilyController::class, 'accept'])->name('family.accept');
        Route::delete('/family/{link}', [Customer\FamilyController::class, 'destroy'])->name('family.destroy');
    });

    Route::middleware(['role:farmer', 'verified', 'onboarded', 'throttle:writes'])->prefix('farmer')->name('farmer.')->group(function () {
        Route::get('/', Farmer\DashboardController::class)->name('dashboard');
        Route::get('/stall-profile', [Farmer\StallController::class, 'edit'])->name('stall.edit');
        Route::put('/stall-profile', [Farmer\StallController::class, 'update'])->name('stall.update');

        Route::middleware('farmer.approved')->group(function () {
            Route::post('/products/apply-template', [Farmer\ProductController::class, 'applyTemplate'])->name('products.apply-template');
            Route::patch('/products/{product}/status', [Farmer\ProductController::class, 'status'])->name('products.status');
            Route::get('/products/{filters?}', [Farmer\ProductController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('products.index');
            Route::resource('products', Farmer\ProductController::class)->except(['show', 'index']);

            Route::get('/orders/{filters?}', [Farmer\OrderController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('orders.index');
            Route::get('/scan', [Farmer\OrderController::class, 'scan'])->name('scan');
            Route::post('/orders/lookup', [Farmer\OrderController::class, 'lookup'])->middleware('throttle:search')->name('orders.lookup');
            Route::get('/orders/{order}', [Farmer\OrderController::class, 'show'])->name('orders.show');
            Route::patch('/orders/{order}/status', [Farmer\OrderController::class, 'status'])->name('orders.status');

            Route::get('/pickup-windows', [Farmer\SlotController::class, 'index'])->name('slots.index');
            Route::post('/pickup-windows', [Farmer\SlotController::class, 'store'])->name('slots.store');
            Route::put('/pickup-windows/cutoff', [Farmer\SlotController::class, 'cutoff'])->name('slots.cutoff');
            Route::put('/pickup-windows/{slot}', [Farmer\SlotController::class, 'update'])->name('slots.update');
            Route::delete('/pickup-windows/{slot}', [Farmer\SlotController::class, 'destroy'])->name('slots.destroy');

            Route::get('/reviews/{filters?}', [Farmer\ReviewController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('reviews.index');

            Route::get('/coupons', [CouponController::class, 'index'])->name('coupons.index');
            Route::post('/coupons', [CouponController::class, 'store'])->name('coupons.store');
            Route::put('/coupons/{coupon}', [CouponController::class, 'update'])->name('coupons.update');
            Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])->name('coupons.destroy');
            Route::put('/reviews/{review}/reply', [Farmer\ReviewController::class, 'reply'])->name('reviews.reply');
        });
    });

    Route::middleware(['role:admin', 'throttle:writes'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', Admin\DashboardController::class)->name('dashboard');

        Route::get('/farmers/{filters?}', [Admin\FarmerController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('farmers.index');
        Route::get('/farmers/{farmer}', [Admin\FarmerController::class, 'show'])->name('farmers.show');
        Route::patch('/farmers/{farmer}/status', [Admin\FarmerController::class, 'status'])->name('farmers.status');

        Route::get('/customers/{filters?}', [Admin\CustomerController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('customers.index');
        Route::patch('/customers/{user}/status', [Admin\CustomerController::class, 'status'])->name('customers.status');

        Route::resource('markets', Admin\MarketController::class)->except('show');
        Route::resource('categories', Admin\CategoryController::class)->except(['show', 'create', 'edit']);
        Route::resource('announcements', Admin\AnnouncementController::class)->except(['show', 'create', 'edit']);

        Route::get('/moderation/listings/{filters?}', [Admin\ModerationController::class, 'products'])->where('filters', PathFilters::pattern())->middleware('filters')->name('moderation.products');
        Route::patch('/moderation/listings/{product}', [Admin\ModerationController::class, 'toggleProduct'])->name('moderation.products.toggle');
        Route::get('/moderation/reviews/{filters?}', [Admin\ModerationController::class, 'reviews'])->where('filters', PathFilters::pattern())->middleware('filters')->name('moderation.reviews');
        Route::patch('/moderation/reviews/{review}', [Admin\ModerationController::class, 'toggleReview'])->name('moderation.reviews.toggle');
        Route::delete('/moderation/reviews/{review}', [Admin\ModerationController::class, 'destroyReview'])->name('moderation.reviews.destroy');

        Route::get('/orders/{filters?}', [Admin\OrderController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('orders.index');
        Route::get('/reports/{filters?}', [Admin\ReportController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('reports.index');
        Route::get('/reports/export/{type}/{filters?}', [Admin\ReportController::class, 'export'])->where('type', 'orders|markets|farmers')->where('filters', PathFilters::pattern())->middleware('filters')->name('reports.export');
        Route::get('/coupons', [CouponController::class, 'index'])->name('coupons.index');
        Route::post('/coupons', [CouponController::class, 'store'])->name('coupons.store');
        Route::put('/coupons/{coupon}', [CouponController::class, 'update'])->name('coupons.update');
        Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])->name('coupons.destroy');

        Route::get('/messages/{filters?}', [Admin\MessageController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('messages.index');
        Route::patch('/messages/{message}', [Admin\MessageController::class, 'read'])->name('messages.read');
        Route::post('/messages/{message}/reply', [Admin\MessageController::class, 'reply'])->middleware('throttle:20,1')->name('messages.reply');

        Route::get('/payments/{filters?}', [Admin\PaymentController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('payments.index');
        Route::get('/payments/{payment}', [Admin\PaymentController::class, 'show'])->name('payments.show');
        Route::post('/payments/{payment}/refund', [Admin\PaymentController::class, 'refund'])->middleware('throttle:20,1')->name('payments.refund');

        Route::get('/badges/{filters?}', [Admin\BadgeController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('badges.index');
        Route::post('/badges/recompute', [Admin\BadgeController::class, 'recompute'])->middleware('throttle:6,1')->name('badges.recompute');
        Route::put('/badges/rules', [Admin\BadgeController::class, 'rules'])->name('badges.rules');
        Route::post('/badges/farmers/{farmer:id}', [Admin\BadgeController::class, 'award'])->name('badges.award');
        Route::patch('/badges/{badge}/revoke', [Admin\BadgeController::class, 'revoke'])->name('badges.revoke');
        Route::patch('/badges/{badge}/unlock', [Admin\BadgeController::class, 'unlock'])->name('badges.unlock');

        Route::resource('seasons', Admin\SeasonController::class)->except(['show', 'create', 'edit']);

        Route::patch('/moderation/review-photos/{photo}', [Admin\ModerationController::class, 'togglePhoto'])->name('moderation.photos.toggle');
        Route::delete('/moderation/review-photos/{photo}', [Admin\ModerationController::class, 'destroyPhoto'])->name('moderation.photos.destroy');

        Route::get('/audit/{filters?}', [Admin\AuditController::class, 'index'])->where('filters', PathFilters::pattern())->middleware('filters')->name('audit.index');
        Route::get('/settings', [Admin\SettingsController::class, 'edit'])->name('settings.edit');
        Route::put('/settings', [Admin\SettingsController::class, 'update'])->name('settings.update');
        Route::patch('/customers/{user}/no-shows', [Admin\CustomerController::class, 'resetNoShows'])->name('customers.no-shows.reset');
        Route::post('/orders/{order}/cancel', [Admin\OrderController::class, 'cancel'])->name('orders.cancel');
        Route::get('/orders/{order}', [Admin\OrderController::class, 'show'])->name('orders.show');
    });
});

Route::fallback([PageController::class, 'notFound']);
