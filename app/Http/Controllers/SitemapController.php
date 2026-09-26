<?php

namespace App\Http\Controllers;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Live XML sitemap: static pages plus every public market, stall and product.
 * Cached for an hour so crawlers never trigger heavy queries.
 */
class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $xml = Cache::remember('sitemap.xml', now()->addHour(), function () {
            $urls = collect([
                [route('home'), now(), 'daily', '1.0'],
                [route('markets.index'), now(), 'daily', '0.9'],
                [route('products.index'), now(), 'daily', '0.9'],
                [route('farmers.index'), now(), 'weekly', '0.8'],
                [route('about'), null, 'monthly', '0.5'],
                [route('contact'), null, 'yearly', '0.5'],
                [route('faq'), null, 'monthly', '0.5'],
                [route('pickup-policy'), null, 'yearly', '0.3'],
                [route('returns'), null, 'yearly', '0.3'],
                [route('terms'), null, 'yearly', '0.2'],
                [route('privacy'), null, 'yearly', '0.2'],
            ]);

            Market::active()->get(['slug', 'updated_at'])
                ->each(fn ($m) => $urls->push([route('markets.show', $m->slug), $m->updated_at, 'weekly', '0.8']));
            FarmerProfile::approved()->get(['slug', 'updated_at'])
                ->each(fn ($f) => $urls->push([route('farmers.show', $f->slug), $f->updated_at, 'weekly', '0.7']));
            Product::listed()->whereHas('farmer', fn ($q) => $q->approved())->get(['slug', 'updated_at'])
                ->each(fn ($p) => $urls->push([route('products.show', $p->slug), $p->updated_at, 'daily', '0.6']));

            $body = $urls->map(fn ($u) => '  <url><loc>'.e($u[0]).'</loc>'
                .($u[1] ? '<lastmod>'.$u[1]->toAtomString().'</lastmod>' : '')
                ."<changefreq>{$u[2]}</changefreq><priority>{$u[3]}</priority></url>")->implode("\n");

            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{$body}\n</urlset>\n";
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
