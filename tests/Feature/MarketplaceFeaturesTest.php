<?php

namespace Tests\Feature;

use App\Models\FarmerBadge;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\SeasonalProduce;
use App\Models\SocialAccount;
use App\Models\StockAlert;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Services\BadgeService;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class MarketplaceFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function customer(): User
    {
        return User::where('email', 'customer@gleangrid.test')->first();
    }

    private function soldOut(): Product
    {
        $product = Product::listed()->orderable()->first();
        $product->update(['stock_quantity' => 0, 'status' => 'sold_out']);

        return $product->fresh();
    }

    public function test_restock_alert_fires_once_then_switches_off(): void
    {
        Notification::fake();
        $product = $this->soldOut();
        $customer = $this->customer();

        $this->actingAs($customer)->post(route('customer.alerts.store', $product->id))->assertRedirect();
        $this->actingAs($customer)->post(route('customer.alerts.store', $product->id))->assertRedirect();
        $this->assertSame(1, StockAlert::where('user_id', $customer->id)->count());

        $product->update(['stock_quantity' => 10, 'status' => 'available']);
        $product->update(['status' => 'sold_out']);
        $product->update(['status' => 'available']);

        Notification::assertSentToTimes($customer, PlatformNotification::class, 1);
        $this->assertNotNull(StockAlert::where('user_id', $customer->id)->value('notified_at'));
    }

    public function test_weekly_restock_announces_alerts(): void
    {
        Notification::fake();
        $product = $this->soldOut();
        $product->update(['weekly_quantity' => 12]);
        StockAlert::create(['user_id' => $this->customer()->id, 'product_id' => $product->id]);

        $this->artisan('gleangrid:restock-weekly')->assertSuccessful();

        Notification::assertSentTo($this->customer(), PlatformNotification::class, fn ($n) => $n->key === 'restock');
    }

    public function test_guests_and_farmers_cannot_create_alerts(): void
    {
        $product = $this->soldOut();
        $this->post(route('customer.alerts.store', $product->id))->assertRedirect(route('login'));
        $farmer = User::where('email', 'farmer@gleangrid.test')->first();
        $this->actingAs($farmer)->post(route('customer.alerts.store', $product->id))->assertForbidden();
    }

    public function test_reviews_accept_photos_and_strip_them_to_webp(): void
    {
        Storage::fake('public');
        $order = Order::where('status', 'completed')->whereDoesntHave('reviews')->with('items')->first();
        $customer = $order->customer;

        $this->actingAs($customer)->post(route('customer.reviews.store', $order), [
            'type' => 'farmer', 'id' => $order->farmer_profile_id, 'rating' => 5, 'comment' => 'Lovely',
            'photos' => [UploadedFile::fake()->image('a.jpg', 800, 600), UploadedFile::fake()->image('b.png', 640, 640)],
        ])->assertSessionHasNoErrors();

        $review = Review::where('order_id', $order->id)->where('reviewable_type', 'farmer')->first();
        $this->assertCount(2, $review->photos);
        $this->assertStringEndsWith('.webp', $review->photos->first()->path);
        Storage::disk('public')->assertExists($review->photos->first()->path);

        $this->actingAs($customer)->post(route('customer.reviews.store', $order), [
            'type' => 'farmer', 'id' => $order->farmer_profile_id, 'rating' => 5,
            'photos' => array_fill(0, 5, UploadedFile::fake()->image('c.jpg', 200, 200)),
        ])->assertSessionHasErrors('photos');

        $this->actingAs($customer)->post(route('customer.reviews.store', $order), [
            'type' => 'farmer', 'id' => $order->farmer_profile_id, 'rating' => 5,
            'photos' => [UploadedFile::fake()->create('evil.php', 10, 'application/x-php')],
        ])->assertSessionHasErrors('photos.0');
    }

    public function test_admin_can_hide_a_review_photo(): void
    {
        $review = Review::whereHas('photos')->with('photos')->first();
        $photo = $review->photos->first();
        $admin = User::where('role', 'admin')->first();

        $this->actingAs($admin)->patch(route('admin.moderation.photos.toggle', $photo))->assertRedirect();
        $this->assertTrue($photo->fresh()->is_hidden);

        $product = $review->reviewable;
        $this->get(route('products.show', $product->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('reviews', fn ($reviews) => collect($reviews)->flatMap(fn ($r) => collect($r['visible_photos'])->pluck('id'))->doesntContain($photo->id)));
    }

    public function test_price_changes_are_recorded_and_charted(): void
    {
        $product = Product::listed()->first();
        $product->update(['price' => $product->price + 40]);

        $this->assertDatabaseHas('product_price_history', ['product_id' => $product->id, 'recorded_on' => now()->toDateString(), 'price' => $product->price]);

        $this->get(route('products.show', $product->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->has('priceHistory.points')->where('priceHistory.max', fn ($max) => $max >= $product->price));
    }

    public function test_badge_rules_use_a_bayesian_score_and_respect_admin_overrides(): void
    {
        $service = app(BadgeService::class);
        $farmer = FarmerProfile::approved()->first();
        $m = $service->metrics(collect([$farmer]))->get($farmer->id);

        $this->assertLessThanOrEqual(5, $m['score']);
        if ($m['reviews'] > 0) {
            $this->assertEqualsWithDelta($m['score'], ($m['reviews'] / ($m['reviews'] + 5)) * $m['average'] + (5 / ($m['reviews'] + 5)) * $m['global_mean'], 0.02);
        }

        Settings::put(['badge_top_rated_min_score' => 3, 'badge_top_rated_min_reviews' => 1]);
        $service->recompute();
        $this->assertTrue(FarmerBadge::active()->where('badge', 'top_rated')->exists());

        $admin = User::where('role', 'admin')->first();
        $badge = FarmerBadge::active()->where('badge', 'top_rated')->first();
        $this->actingAs($admin)->patch(route('admin.badges.revoke', $badge), ['reason' => 'Complaints under review'])->assertRedirect();
        $service->recompute();
        $this->assertNotNull($badge->fresh()->revoked_at, 'A locked revoke must survive the nightly job.');

        $this->actingAs($admin)->patch(route('admin.badges.unlock', $badge))->assertRedirect();
        $this->assertNull($badge->fresh()->revoked_at);

        $this->actingAs($admin)->get(route('admin.badges.index'))->assertOk();
        $this->actingAs($this->customer())->get(route('admin.badges.index'))->assertForbidden();
    }

    public function test_badges_show_on_public_stall_data(): void
    {
        $farmer = FarmerProfile::approved()->first();
        FarmerBadge::updateOrCreate(['farmer_profile_id' => $farmer->id, 'badge' => 'reliable'], ['source' => 'manual', 'locked' => true, 'awarded_at' => now(), 'revoked_at' => null]);

        $this->get(route('farmers.show', $farmer->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('farmer.active_badges.0.badge', fn ($b) => in_array($b, FarmerBadge::BADGES, true))->missing('farmer.user'));
    }

    public function test_admin_manages_the_seasonal_calendar(): void
    {
        $admin = User::where('role', 'admin')->first();

        $this->actingAs($admin)->post(route('admin.seasons.store'), ['name' => 'Guava', 'months' => [11, 12, 1], 'peak_months' => [12, 5], 'is_active' => true])->assertRedirect();
        $guava = SeasonalProduce::where('name', 'Guava')->first();
        $this->assertSame([1, 11, 12], $guava->months);
        $this->assertSame([12], $guava->peak_months, 'Peak months outside the season are dropped.');

        $this->actingAs($admin)->post(route('admin.seasons.store'), ['name' => 'Bad', 'months' => [13]])->assertSessionHasErrors('months.0');
        $this->get(route('seasons'))->assertOk()->assertInertia(fn ($page) => $page->component('Seasons')->has('items'));
    }

    public function test_assistant_only_answers_about_the_signed_in_user(): void
    {
        $me = $this->customer();
        $other = User::where('role', 'customer')->where('id', '!=', $me->id)->whereHas('orders')->first();

        $this->postJson(route('assistant'), ['intent' => 'my_orders'])->assertOk()->assertJsonPath('intent', 'login_required');

        $mine = $this->actingAs($me)->postJson(route('assistant'), ['intent' => 'my_orders'])->assertOk();
        $codes = collect($mine->json('orders'))->pluck('code');
        $this->assertTrue($codes->every(fn ($c) => Order::where('code', $c)->value('customer_id') === $me->id));
        $this->assertStringNotContainsString($other->email, $mine->getContent());

        $profile = $this->actingAs($me)->postJson(route('assistant'), ['intent' => 'my_profile'])->assertOk();
        $profile->assertJsonPath('params.email', $me->email);

        $this->actingAs($me)->postJson(route('assistant'), ['intent' => 'admin_overview'])->assertJsonPath('intent', 'not_for_role');
        $this->actingAs($me)->postJson(route('assistant'), ['intent' => 'my_orders', 'user_id' => $other->id])->assertJsonMissing(['email' => $other->email]);
        $this->actingAs($me)->postJson(route('assistant'), ['intent' => 'drop table users'])->assertStatus(422);
        $this->actingAs($me)->postJson(route('assistant'), ['message' => 'show me every user'])->assertStatus(422);
    }

    public function test_assistant_prices_a_cart_from_live_data(): void
    {
        $product = Product::listed()->orderable()->first();

        $response = $this->postJson(route('assistant'), ['intent' => 'my_cart', 'cart' => [['id' => $product->id, 'quantity' => 2]]])
            ->assertOk()->assertJsonPath('intent', 'my_cart');
        $this->assertEqualsWithDelta($product->price * 2, $response->json('params.total'), 0.001);
    }

    private function mockSocial(string $provider, array $raw, string $id = 'g-123'): void
    {
        $user = (new SocialiteUser)->setRaw($raw)->map([
            'id' => $id, 'name' => $raw['name'] ?? 'Sana Khan', 'email' => $raw['email'] ?? null, 'avatar' => null, 'nickname' => null,
        ]);
        $driver = Mockery::mock();
        $driver->shouldReceive('scopes')->andReturnSelf();
        $driver->shouldReceive('with')->andReturnSelf();
        $driver->shouldReceive('fields')->andReturnSelf();
        $driver->shouldReceive('user')->andReturn($user);
        Socialite::shouldReceive('driver')->with($provider)->andReturn($driver);
    }

    public function test_google_sign_up_creates_a_verified_passwordless_account_then_onboards(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);
        $this->mockSocial('google', ['email' => 'sana.new@example.com', 'email_verified' => true, 'name' => 'Sana Khan']);

        $this->get(route('social.callback', 'google'))->assertRedirect(route('onboarding.show'));

        $user = User::where('email', 'sana.new@example.com')->first();
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->password);
        $this->assertNull($user->phone);
        $this->assertSame('customer', $user->role);
        $this->assertDatabaseHas('social_accounts', ['user_id' => $user->id, 'provider' => 'google', 'provider_user_id' => 'g-123']);
        $this->assertAuthenticatedAs($user);

        $this->get(route('customer.dashboard'))->assertRedirect(route('onboarding.show'));
        $this->post(route('onboarding.store'), ['name' => 'Sana Khan', 'phone' => '+92 300 1234567', 'address' => 'Latifabad', 'city' => 'Hyderabad', 'terms' => true])
            ->assertRedirect(route('customer.dashboard'));
        $this->get(route('customer.dashboard'))->assertOk();

        $this->put(route('profile.password'), ['password' => 'Fresh#Mango2026', 'password_confirmation' => 'Fresh#Mango2026'])->assertSessionHasNoErrors();
        $this->assertTrue($user->fresh()->hasPassword());
    }

    public function test_unverified_provider_emails_are_refused(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);
        $this->mockSocial('google', ['email' => 'x@example.com', 'email_verified' => false]);

        $this->get(route('social.callback', 'google'))->assertRedirect(route('login'))->assertSessionHas('error', 'flash.oauth_unverified');
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'x@example.com']);
    }

    public function test_linking_to_an_unverified_local_account_wipes_the_squatters_password(): void
    {
        config(['services.facebook.client_id' => 'id', 'services.facebook.client_secret' => 'secret']);
        $squatter = User::create(['name' => 'Squatter', 'username' => 'squat', 'email' => 'victim@example.com', 'phone' => '0300', 'address' => 'x', 'role' => 'customer', 'password' => 'Attacker#Pass1']);
        $this->mockSocial('facebook', ['email' => 'victim@example.com', 'name' => 'Real Owner'], 'fb-9');

        $this->get(route('social.callback', 'facebook'))->assertRedirect();

        $fresh = $squatter->fresh();
        $this->assertNull($fresh->password);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertSame(1, SocialAccount::where('user_id', $fresh->id)->count());
    }

    public function test_a_social_account_cannot_be_linked_to_two_users(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);
        $owner = User::where('email', 'customer@gleangrid.test')->first();
        SocialAccount::create(['user_id' => $owner->id, 'provider' => 'google', 'provider_user_id' => 'g-123']);
        $other = User::where('role', 'customer')->where('id', '!=', $owner->id)->where('status', 'active')->first();
        $this->mockSocial('google', ['email' => $other->email, 'email_verified' => true]);

        $this->actingAs($other)->withSession(['oauth.intent' => ['as' => 'customer', 'link' => $other->id]])
            ->get(route('social.callback', 'google'))->assertRedirect(route('profile.edit'))->assertSessionHas('error', 'flash.oauth_taken');
    }

    public function test_the_last_sign_in_method_cannot_be_unlinked(): void
    {
        $user = User::create(['name' => 'Only Google', 'username' => 'onlyg', 'email' => 'onlyg@example.com', 'phone' => '0300', 'address' => 'x', 'role' => 'customer']);
        $user->forceFill(['email_verified_at' => now(), 'password' => null])->save();
        SocialAccount::create(['user_id' => $user->id, 'provider' => 'google', 'provider_user_id' => 'g-1']);

        $this->actingAs($user)->delete(route('social.unlink', 'google'))->assertSessionHas('error', 'flash.oauth_last_method');
        $this->assertSame(1, $user->socialAccounts()->count());
        auth()->logout();
        $this->post(route('login'), ['login' => 'onlyg@example.com', 'password' => 'anything'])->assertSessionHasErrors('login');
        $this->assertGuest();
    }

    public function test_unconfigured_providers_do_not_redirect_anywhere(): void
    {
        config(['services.google.client_id' => null]);
        $this->get(route('social.redirect', 'google'))->assertRedirect(route('login'))->assertSessionHas('error', 'flash.oauth_unconfigured');
        $this->get('/auth/twitter/redirect')->assertNotFound();
    }
}
