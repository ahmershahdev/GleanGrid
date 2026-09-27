<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PathFilters;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CleanUrlTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_filters_are_path_segments_and_round_trip(): void
    {
        $params = ['q' => 'raw honey', 'category' => 'fruits', 'day' => '0', 'min' => '100', 'max' => '500', 'in_stock' => '1', 'sort' => 'price_asc', 'page' => '2'];
        $path = PathFilters::segments($params);

        $this->assertSame('search/raw-honey/category/fruits/day/sunday/price/100-500/in-stock/sort/price-low/page/2', $path);
        $this->assertSame($params, PathFilters::parse($path));
        $this->assertStringNotContainsString('?', PathFilters::url('products.index', $params));
    }

    public function test_old_query_string_links_redirect_permanently_to_clean_paths(): void
    {
        $this->get('/products?category=fruits&sort=price_asc')->assertStatus(301)->assertRedirect('/products/category/fruits/sort/price-low');
        $this->get('/farmers?sort=name&q=honey')->assertStatus(301)->assertRedirect('/farmers/search/honey/sort/a-z');
        $this->get('/products/sort/price-low/category/fruits')->assertStatus(301)->assertRedirect('/products/category/fruits/sort/price-low');
    }

    public function test_clean_filter_paths_render_with_their_filters(): void
    {
        $this->get('/products/category/fruits/in-stock/sort/price-high')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Products/Index')
            ->where('filters.category', 'fruits')
            ->where('filters.sort', 'price_desc')
            ->where('filters.in_stock', '1'));

        $this->get('/markets/day/sunday')->assertOk()->assertInertia(fn (Assert $page) => $page->where('filters.day', '0'));
        $this->get('/products/nonsense/value')->assertNotFound();
    }

    public function test_hyphenated_search_matches_every_word(): void
    {
        $this->get('/products/search/free-range')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('products.data', fn ($items) => collect($items)->pluck('name')->contains('Free-range Eggs')));
    }

    public function test_pagination_links_have_no_query_string(): void
    {
        $this->get('/products')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('products.next_page_url', fn ($url) => str_ends_with($url, '/products/page/2')));

        $this->get('/products/page/2')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('products.current_page', 2)
            ->where('products.prev_page_url', fn ($url) => str_ends_with($url, '/products') && ! str_contains($url, '?')));
    }

    public function test_filtered_listings_are_canonical_to_the_plain_or_category_page(): void
    {
        $this->get('/products/category/fruits/sort/price-low/page/2')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('seo.url', fn ($url) => str_ends_with($url, '/products/category/fruits')));
    }

    public function test_farmer_sign_up_and_password_reset_links_are_clean(): void
    {
        $this->get('/register/farmer')->assertOk()->assertInertia(fn (Assert $page) => $page->where('role', 'farmer'));

        Notification::fake();
        $user = User::where('email', 'customer@gleangrid.test')->firstOrFail();
        $user->notify(new ResetPassword('token123'));
        Notification::assertSentTo($user, ResetPassword::class, function ($n) use ($user) {
            $url = $n->toMail($user)->actionUrl;

            return str_ends_with($url, '/reset-password/token123') && ! str_contains($url, '?');
        });
    }
}
