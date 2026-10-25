<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoLimitsTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    /** Every public, indexable URL: the static pages plus each seeded market, farmer and product. */
    private function publicUrls(): array
    {
        return [
            ...collect(['home', 'markets.index', 'farmers.index', 'products.index', 'about', 'contact', 'faq', 'terms', 'privacy', 'returns', 'pickup-policy', 'seasons', 'login', 'register', 'password.request'])
                ->map(fn ($r) => route($r))->all(),
            ...Market::active()->pluck('slug')->map(fn ($s) => route('markets.show', $s))->all(),
            ...FarmerProfile::approved()->pluck('slug')->map(fn ($s) => route('farmers.show', $s))->all(),
            ...Product::listed()->pluck('slug')->map(fn ($s) => route('products.show', $s))->all(),
            url('/this-page-does-not-exist'),
        ];
    }

    private function meta(string $html, string $attr, string $key): ?string
    {
        return preg_match('#<meta[^>]+'.$attr.'="'.preg_quote($key, '#').'"[^>]+content="([^"]*)"#', $html, $m)
            ? html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5) : null;
    }

    public function test_every_public_page_has_a_short_title_and_description_and_full_social_tags(): void
    {
        foreach ($this->publicUrls() as $url) {
            $html = $this->get($url)->getContent();

            $this->assertMatchesRegularExpression('#<title[^>]*>([^<]+)</title>#', $html, $url);
            preg_match('#<title[^>]*>([^<]+)</title>#', $html, $t);
            $title = html_entity_decode($t[1], ENT_QUOTES | ENT_HTML5);
            $description = (string) $this->meta($html, 'name', 'description');

            $this->assertLessThan(60, mb_strlen($title), "title too long on {$url}: {$title}");
            $this->assertLessThan(150, mb_strlen($description), "description too long on {$url}: {$description}");
            $this->assertGreaterThanOrEqual(50, mb_strlen($description), "description too short on {$url}");

            foreach (['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name'] as $og) {
                $this->assertNotEmpty($this->meta($html, 'property', $og), "{$og} missing on {$url}");
            }
            foreach (['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'] as $tw) {
                $this->assertNotEmpty($this->meta($html, 'name', $tw), "{$tw} missing on {$url}");
            }
            $this->assertMatchesRegularExpression('#<link rel="canonical" href="https?://#', $html, "canonical missing on {$url}");

            preg_match('#<script type="application/ld\+json"[^>]*>(.*?)</script>#s', $html, $ld);
            $this->assertNotEmpty($ld, "JSON-LD missing on {$url}");
            $this->assertArrayHasKey('@graph', json_decode($ld[1], true, 512, JSON_THROW_ON_ERROR));
        }
    }

    public function test_private_pages_are_noindex(): void
    {
        foreach (['/cart', '/login', '/register', '/this-page-does-not-exist'] as $path) {
            $this->assertSame('noindex, nofollow', $this->meta($this->get($path)->getContent(), 'name', 'robots'), $path);
        }
    }
}
