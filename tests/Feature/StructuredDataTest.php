<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StructuredDataTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    /** The page's JSON-LD @graph, keyed by @type (first of each). */
    private function graph(string $url): array
    {
        $html = $this->get($url)->assertOk()->getContent();
        preg_match('#<script type="application/ld\+json"[^>]*>(.*?)</script>#s', $html, $m);
        $this->assertNotEmpty($m, "no JSON-LD on {$url}");
        $data = json_decode($m[1], true, 512, JSON_THROW_ON_ERROR);

        return collect($data['@graph'])->keyBy('@type')->all();
    }

    public function test_site_search_template_points_at_a_real_clean_url(): void
    {
        $site = $this->graph(route('home'))['WebSite'];
        $template = $site['potentialAction']['target']['urlTemplate'];

        $this->assertStringNotContainsString('?', $template);
        $this->get(str_replace('{search_term_string}', 'honey', $template))->assertOk();
    }

    public function test_the_founder_is_the_same_person_entity_as_the_portfolio(): void
    {
        $g = $this->graph(route('home'));

        $this->assertSame('https://ahmershah.dev/#person', $g['Organization']['founder']['@id']);
        $this->assertSame('https://ahmershah.dev/#person', $g['WebSite']['creator']['@id']);
    }

    public function test_products_stalls_and_markets_are_linked_entities(): void
    {
        $product = Product::listed()->whereHas('farmer', fn ($q) => $q->approved())->firstOrFail();
        $p = $this->graph(route('products.show', $product->slug))['Product'];

        $this->assertStringEndsWith('#product', $p['@id']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $p['offers']['priceValidUntil']);
        $this->assertStringStartsWith('http', $p['image']);
        $this->assertSame(route('farmers.show', $product->farmer->slug).'#business', $p['offers']['seller']['@id']);

        $stall = $this->graph(route('farmers.show', FarmerProfile::approved()->firstOrFail()->slug))['LocalBusiness'];
        $this->assertStringEndsWith('#business', $stall['@id']);
        $this->assertSame('Hyderabad', $stall['address']['addressLocality']);

        $place = $this->graph(route('markets.show', Market::active()->firstOrFail()->slug))['Place'];
        $this->assertStringEndsWith('#place', $place['@id']);
    }
}
