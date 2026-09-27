<?php

namespace App\Http\Controllers;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use App\Support\LegalContent;
use App\Support\Seo;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $xml = Cache::remember('sitemap.xml', now()->addHour(), function () {
            $urls = collect([
                [route('home'), now(), 'daily', '1.0', [[asset(Seo::IMAGE), 'GleanGrid — Hyderabad farmers markets, online']]],
                [route('markets.index'), now(), 'daily', '0.9', []],
                [route('products.index'), now(), 'daily', '0.9', []],
                [route('farmers.index'), now(), 'weekly', '0.8', []],
                [route('about'), null, 'monthly', '0.6', []],
                [route('contact'), null, 'yearly', '0.5', []],
                [route('faq'), $this->updated(), 'monthly', '0.6', []],
                [route('pickup-policy'), $this->updated(), 'yearly', '0.4', []],
                [route('returns'), $this->updated(), 'yearly', '0.4', []],
                [route('terms'), $this->updated(), 'yearly', '0.3', []],
                [route('privacy'), $this->updated(), 'yearly', '0.3', []],
            ]);

            Market::active()->get(['slug', 'name', 'updated_at'])
                ->each(fn ($m) => $urls->push([route('markets.show', $m->slug), $m->updated_at, 'weekly', '0.8', []]));
            FarmerProfile::approved()->get(['id', 'slug', 'stall_name', 'logo', 'updated_at'])
                ->each(fn ($f) => $urls->push([route('farmers.show', $f->slug), $f->updated_at, 'weekly', '0.7', array_filter([$f->logo_url ? [$f->logo_url, $f->stall_name] : null])]));
            Product::listed()->whereHas('farmer', fn ($q) => $q->approved())->get(['id', 'slug', 'name', 'image', 'photo', 'updated_at'])
                ->each(fn ($p) => $urls->push([route('products.show', $p->slug), $p->updated_at, 'daily', '0.6', array_filter([$p->photo_url ? [$p->photo_url, $p->name] : null, $p->image_url ? [$p->image_url, $p->name] : null])]));

            $body = $urls->map(function ($u) {
                $images = collect($u[4])->map(fn ($img) => '<image:image><image:loc>'.e($img[0]).'</image:loc><image:caption>'.e($img[1]).'</image:caption></image:image>')->implode('');

                return '  <url><loc>'.e($u[0]).'</loc>'
                    .($u[1] ? '<lastmod>'.$u[1]->toAtomString().'</lastmod>' : '')
                    ."<changefreq>{$u[2]}</changefreq><priority>{$u[3]}</priority>{$images}</url>";
            })->implode("\n");

            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                ."<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n{$body}\n</urlset>\n";
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8', 'X-Robots-Tag' => 'noindex']);
    }

    private function updated(): Carbon
    {
        return Carbon::parse(LegalContent::UPDATED)->startOfDay();
    }
}
