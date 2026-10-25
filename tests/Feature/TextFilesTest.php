<?php

namespace Tests\Feature;

use App\Models\Market;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TextFilesTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_robots_txt_points_at_this_deployments_sitemap_and_blocks_private_areas(): void
    {
        $body = $this->get('/robots.txt')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->getContent();

        $this->assertStringContainsString('Sitemap: '.route('sitemap'), $body);
        foreach (['/account', '/admin/', '/farmer/', '/cart', '/login'] as $private) {
            $this->assertStringContainsString("Disallow: {$private}", $body);
        }
    }

    public function test_llms_files_are_built_from_live_data_with_this_deployments_urls(): void
    {
        $summary = $this->get('/llms.txt')->assertOk()->assertHeader('Content-Type', 'text/plain; charset=UTF-8')->getContent();
        $full = $this->get('/llms-full.txt')->assertOk()->getContent();

        $this->assertStringStartsWith('# GleanGrid', $summary);
        $this->assertStringContainsString(url('llms-full.txt'), $summary);
        $this->assertStringContainsString('## Frequently asked questions', $full);
        $this->assertGreaterThan(strlen($summary), strlen($full));

        foreach (config('gleangrid.project') as $link) {
            $this->assertStringContainsString($link, $summary);
        }

        $market = Market::active()->first();
        $this->assertStringContainsString(route('markets.show', $market->slug), $summary);
    }

    public function test_sitemap_lists_only_absolute_urls_on_this_host(): void
    {
        $xml = simplexml_load_string($this->get('/sitemap.xml')->assertOk()->getContent());
        $xml->registerXPathNamespace('s', 'http://www.sitemaps.org/schemas/sitemap/0.9');
        $xml->registerXPathNamespace('image', 'http://www.google.com/schemas/sitemap-image/1.1');

        $locs = array_map('strval', [...$xml->xpath('//s:loc'), ...$xml->xpath('//image:loc')]);
        $this->assertNotEmpty($locs);
        foreach ($locs as $loc) {
            $this->assertStringStartsWith(url('/'), $loc);
        }
    }
}
