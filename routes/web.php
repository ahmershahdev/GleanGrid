<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\Customer;
use App\Http\Controllers\Farmer;
use App\Http\Controllers\FarmerController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MarketController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PreferenceController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ResendWebhookController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

/* ---------------------------------------------------------------- Public */
Route::get('/', HomeController::class)->name('home');
Route::get('/markets', [MarketController::class, 'index'])->name('markets.index');
Route::get('/markets/{market:slug}', [MarketController::class, 'show'])->name('markets.show');
Route::get('/farmers', [FarmerController::class, 'index'])->name('farmers.index');
Route::get('/farmers/{farmer:slug}', [FarmerController::class, 'show'])->name('farmers.show');
Route::get('/products', [ProductController::class, 'index'])->name('products.index');
Route::get('/products/{product:slug}', [ProductController::class, 'show'])->name('products.show');
Route::get('/about', [PageController::class, 'about'])->name('about');
Route::get('/contact', [PageController::class, 'contact'])->name('contact');
Route::get('/faq', [PageController::class, 'faq'])->name('faq');
Route::get('/terms', [PageController::class, 'legal'])->defaults('page', 'terms')->name('terms');
Route::get('/privacy', [PageController::class, 'legal'])->defaults('page', 'privacy')->name('privacy');
Route::get('/returns', [PageController::class, 'legal'])->defaults('page', 'returns')->name('returns');
Route::get('/pickup-policy', [PageController::class, 'legal'])->defaults('page', 'pickup')->name('pickup-policy');
Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');

// Inbound e-mail from Resend (Svix-signed; CSRF-exempt in bootstrap/app.php).
Route::post('/webhooks/resend/inbound', ResendWebhookController::class)->middleware('throttle:60,1')->name('webhooks.resend');
Route::post('/contact', [PageController::class, 'sendContact'])->middleware('throttle:contact')->name('contact.send');
Route::get('/cart', [CartController::class, 'show'])->name('cart');
Route::post('/cart/sync', [CartController::class, 'sync'])->name('cart.sync');
Route::post('/assistant', AssistantController::class)->middleware('throttle:assistant')->name('assistant');
Route::post('/preferences/locale', [PreferenceController::class, 'locale'])->name('preferences.locale');

/* ------------------------------------------------------------------ Auth */
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::get('/forgot-password', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'email'])->middleware('throttle:password')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'reset'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])->middleware('throttle:password')->name('password.update');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/verify-email', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::post('/verify-email', [EmailVerificationController::class, 'verify'])->middleware('throttle:verify')->name('verification.verify');
    Route::post('/verify-email/resend', [EmailVerificationController::class, 'resend'])->middleware('throttle:resend')->name('verification.resend');
    Route::get('/dashboard', fn () => redirect()->route(auth()->user()->dashboardRoute()))->name('dashboard');

    Route::get('/account/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/account/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/account/password', [ProfileController::class, 'password'])->middleware('throttle:password')->name('profile.password');
    Route::delete('/account/sessions', [ProfileController::class, 'destroyOtherSessions'])->middleware('throttle:password')->name('profile.sessions.destroy');

    Route::get('/account/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/account/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('/account/notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');

    /* ------------------------------------------------------- Customer */
    Route::middleware(['role:customer', 'verified', 'throttle:writes'])->prefix('account')->name('customer.')->group(function () {
        Route::get('/', Customer\DashboardController::class)->name('dashboard');
        Route::get('/checkout', [Customer\CheckoutController::class, 'show'])->name('checkout');
        Route::post('/checkout/coupon', [CouponController::class, 'preview'])->middleware('throttle:20,1')->name('coupons.preview');
        Route::post('/checkout', [Customer\CheckoutController::class, 'store'])->name('checkout.store');
        Route::get('/orders', [Customer\OrderController::class, 'index'])->name('orders.index');
        Route::get('/orders/{order}', [Customer\OrderController::class, 'show'])->name('orders.show');
        Route::get('/orders/{order}/edit', [Customer\OrderController::class, 'edit'])->name('orders.edit');
        Route::put('/orders/{order}', [Customer\OrderController::class, 'update'])->name('orders.update');
        Route::post('/orders/{order}/cancel', [Customer\OrderController::class, 'cancel'])->name('orders.cancel');
        Route::post('/orders/{order}/reviews', [Customer\ReviewController::class, 'store'])->name('reviews.store');
        Route::get('/reviews', [Customer\ReviewController::class, 'index'])->name('reviews.index');
        Route::get('/favorites', [Customer\FavoriteController::class, 'index'])->name('favorites.index');
        Route::post('/favorites/{type}/{id}', [Customer\FavoriteController::class, 'toggle'])->name('favorites.toggle');
        Route::patch('/favorites/{favorite}', [Customer\FavoriteController::class, 'update'])->name('favorites.update');
        Route::get('/family', [Customer\FamilyController::class, 'index'])->name('family.index');
        Route::post('/family', [Customer\FamilyController::class, 'invite'])->name('family.invite');
        Route::post('/family/{link}/accept', [Customer\FamilyController::class, 'accept'])->name('family.accept');
        Route::delete('/family/{link}', [Customer\FamilyController::class, 'destroy'])->name('family.destroy');
    });

    /* --------------------------------------------------------- Farmer */
    Route::middleware(['role:farmer', 'verified', 'throttle:writes'])->prefix('farmer')->name('farmer.')->group(function () {
        Route::get('/', Farmer\DashboardController::class)->name('dashboard');
        Route::get('/stall-profile', [Farmer\StallController::class, 'edit'])->name('stall.edit');
        Route::put('/stall-profile', [Farmer\StallController::class, 'update'])->name('stall.update');

        Route::middleware('farmer.approved')->group(function () {
            Route::post('/products/apply-template', [Farmer\ProductController::class, 'applyTemplate'])->name('products.apply-template');
            Route::patch('/products/{product}/status', [Farmer\ProductController::class, 'status'])->name('products.status');
            Route::resource('products', Farmer\ProductController::class)->except('show');

            Route::get('/orders', [Farmer\OrderController::class, 'index'])->name('orders.index');
            Route::get('/orders/{order}', [Farmer\OrderController::class, 'show'])->name('orders.show');
            Route::patch('/orders/{order}/status', [Farmer\OrderController::class, 'status'])->name('orders.status');

            Route::get('/pickup-windows', [Farmer\SlotController::class, 'index'])->name('slots.index');
            Route::post('/pickup-windows', [Farmer\SlotController::class, 'store'])->name('slots.store');
            Route::put('/pickup-windows/cutoff', [Farmer\SlotController::class, 'cutoff'])->name('slots.cutoff');
            Route::put('/pickup-windows/{slot}', [Farmer\SlotController::class, 'update'])->name('slots.update');
            Route::delete('/pickup-windows/{slot}', [Farmer\SlotController::class, 'destroy'])->name('slots.destroy');

            Route::get('/reviews', [Farmer\ReviewController::class, 'index'])->name('reviews.index');

            Route::get('/coupons', [CouponController::class, 'index'])->name('coupons.index');
            Route::post('/coupons', [CouponController::class, 'store'])->name('coupons.store');
            Route::put('/coupons/{coupon}', [CouponController::class, 'update'])->name('coupons.update');
            Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])->name('coupons.destroy');
            Route::put('/reviews/{review}/reply', [Farmer\ReviewController::class, 'reply'])->name('reviews.reply');
        });
    });

    /* ---------------------------------------------------------- Admin */
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', Admin\DashboardController::class)->name('dashboard');

        Route::get('/farmers', [Admin\FarmerController::class, 'index'])->name('farmers.index');
        Route::get('/farmers/{farmer}', [Admin\FarmerController::class, 'show'])->name('farmers.show');
        Route::patch('/farmers/{farmer}/status', [Admin\FarmerController::class, 'status'])->name('farmers.status');

        Route::get('/customers', [Admin\CustomerController::class, 'index'])->name('customers.index');
        Route::patch('/customers/{user}/status', [Admin\CustomerController::class, 'status'])->name('customers.status');

        Route::resource('markets', Admin\MarketController::class)->except('show');
        Route::resource('categories', Admin\CategoryController::class)->except(['show', 'create', 'edit']);
        Route::resource('announcements', Admin\AnnouncementController::class)->except(['show', 'create', 'edit']);

        Route::get('/moderation/listings', [Admin\ModerationController::class, 'products'])->name('moderation.products');
        Route::patch('/moderation/listings/{product}', [Admin\ModerationController::class, 'toggleProduct'])->name('moderation.products.toggle');
        Route::get('/moderation/reviews', [Admin\ModerationController::class, 'reviews'])->name('moderation.reviews');
        Route::patch('/moderation/reviews/{review}', [Admin\ModerationController::class, 'toggleReview'])->name('moderation.reviews.toggle');
        Route::delete('/moderation/reviews/{review}', [Admin\ModerationController::class, 'destroyReview'])->name('moderation.reviews.destroy');

        Route::get('/orders', [Admin\OrderController::class, 'index'])->name('orders.index');
        Route::get('/reports', [Admin\ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/export/{type}', [Admin\ReportController::class, 'export'])->name('reports.export');
        Route::get('/coupons', [CouponController::class, 'index'])->name('coupons.index');
        Route::post('/coupons', [CouponController::class, 'store'])->name('coupons.store');
        Route::put('/coupons/{coupon}', [CouponController::class, 'update'])->name('coupons.update');
        Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])->name('coupons.destroy');

        Route::get('/messages', [Admin\MessageController::class, 'index'])->name('messages.index');
        Route::patch('/messages/{message}', [Admin\MessageController::class, 'read'])->name('messages.read');
        Route::post('/messages/{message}/reply', [Admin\MessageController::class, 'reply'])->middleware('throttle:20,1')->name('messages.reply');
    });
});

/* -------------------------------------------------------- Not found
   Runs through the web middleware (session, locale, shared props), so the
   designed 404 page gets the full header, footer and translations. */
Route::fallback([PageController::class, 'notFound']);
