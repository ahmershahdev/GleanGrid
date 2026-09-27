<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\PathFilters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_public_pages_render(): void
    {
        $market = Market::first();
        $farmer = FarmerProfile::approved()->first();
        $product = Product::listed()->first();

        foreach ([
            route('home'), route('markets.index'), PathFilters::url('markets.index', ['day' => 0, 'lat' => 25.39, 'lng' => 68.36]),
            route('markets.show', $market->slug), PathFilters::url('farmers.index', ['sort' => 'name']), route('farmers.show', $farmer->slug),
            PathFilters::url('products.index', ['q' => 'mango', 'sort' => 'price_desc', 'in_stock' => 1]), route('products.show', $product->slug),
            route('about'), route('seasons'), route('contact'), route('cart'), route('login'), route('register'),
        ] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_customer_pages_render(): void
    {
        $customer = User::where('email', 'customer@gleangrid.test')->first();
        $order = $customer->orders()->first();

        foreach ([
            route('customer.dashboard'), route('customer.checkout'), route('customer.orders.index'), PathFilters::url('customer.orders.index', ['household' => 1, 'status' => 'open']),
            route('customer.orders.show', $order), route('customer.favorites.index'), route('customer.reviews.index'), route('customer.family.index'),
            route('profile.edit'), route('notifications.index'),
        ] as $url) {
            $this->actingAs($customer)->get($url)->assertOk();
        }
    }

    public function test_farmer_pages_render(): void
    {
        $farmer = User::where('email', 'farmer@gleangrid.test')->first();
        $order = Order::where('farmer_profile_id', $farmer->farmerProfile->id)->first();
        $product = $farmer->farmerProfile->products()->first();

        foreach ([
            route('farmer.dashboard'), route('farmer.stall.edit'), route('farmer.products.index'), route('farmer.products.create'),
            route('farmer.products.edit', $product), route('farmer.orders.index'), route('farmer.orders.show', $order),
            route('farmer.slots.index'), route('farmer.reviews.index'),
        ] as $url) {
            $this->actingAs($farmer)->get($url)->assertOk();
        }
    }

    public function test_admin_pages_render(): void
    {
        $admin = User::where('role', 'admin')->first();

        foreach ([
            route('admin.dashboard'), route('admin.farmers.index'), route('admin.farmers.show', FarmerProfile::first()), route('admin.customers.index'),
            route('admin.markets.index'), route('admin.markets.create'), route('admin.markets.edit', Market::first()), route('admin.categories.index'),
            route('admin.announcements.index'), route('admin.moderation.products'), route('admin.moderation.reviews'), route('admin.orders.index'),
            route('admin.reports.index'), route('admin.messages.index'),
        ] as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }

        $this->actingAs($admin)->get(route('admin.reports.export', 'orders'))->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_roles_cannot_enter_each_others_areas(): void
    {
        $customer = User::where('role', 'customer')->first();
        $farmer = User::where('email', 'farmer@gleangrid.test')->first();

        $this->actingAs($customer)->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs($customer)->get(route('farmer.dashboard'))->assertForbidden();
        $this->actingAs($farmer)->get(route('customer.dashboard'))->assertForbidden();

        auth()->logout();
        $this->get(route('customer.orders.index'))->assertRedirect(route('login'));
    }

    public function test_assistant_answers_from_live_data(): void
    {
        $this->postJson(route('assistant'), ['intent' => 'browse', 'topic' => 'mango'])->assertOk()->assertJsonPath('intent', 'products_found');
        $this->postJson(route('assistant'), ['intent' => 'market_timings'])->assertOk()->assertJsonPath('intent', 'market_timings');
        $this->postJson(route('assistant'), ['intent' => 'faq_payment'])->assertOk()->assertJsonPath('intent', 'faq_payment');
        $this->postJson(route('assistant'), ['intent' => 'in_season'])->assertOk()->assertJsonPath('intent', 'in_season');
        $this->postJson(route('assistant'), ['message' => 'Who has mangoes?'])->assertStatus(422);
    }

    public function test_urls_are_case_insensitive_and_aliases_redirect(): void
    {
        $this->get('/Contact')->assertStatus(301)->assertRedirect('/contact');
        $this->get('/FARMERS?sort=name')->assertStatus(301)->assertRedirect('/farmers?sort=name');
        $this->get('/contact-us')->assertStatus(301)->assertRedirect('/contact');
        $this->get('/TOS')->assertStatus(301)->assertRedirect('/terms');
        $this->get('/Products/'.strtoupper(Product::listed()->value('slug')))->assertStatus(301);
        $this->get('/definitely-not-a-page')->assertNotFound();
    }

    public function test_empty_filters_are_sent_as_an_object(): void
    {
        foreach (['farmers.index', 'products.index', 'markets.index'] as $name) {
            $this->assertStringContainsString('"filters":{}', $this->get(route($name))->getContent(), $name);
        }
    }
}
