<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use App\Support\LegalContent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\URL;

/**
 * Writes public/llms.txt (a short, linked map for AI assistants, per llmstxt.org)
 * and public/llms-full.txt (the same plus markets, stalls, FAQ and policies inline),
 * straight from the database so they never drift from the live site.
 */
class GenerateLlmsFiles extends Command
{
    protected $signature = 'gleangrid:llms {--url=https://gleangrid.ahmershah.dev : Public base URL to use in links}';

    protected $description = 'Generate public/llms.txt and public/llms-full.txt from live data';

    private const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    public function handle(): int
    {
        $base = rtrim($this->option('url'), '/');
        URL::forceRootUrl($base);
        URL::forceScheme(parse_url($base, PHP_URL_SCHEME) ?: 'https');

        $markets = Market::active()->orderBy('name')->get();
        $farmers = FarmerProfile::approved()->withCount(['products' => fn ($q) => $q->listed()])->orderByDesc('rating_avg')->get();
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
        $contact = config('gleangrid.contact');

        $intro = <<<MD
# GleanGrid

> GleanGrid is a pre-order marketplace for farmers markets in Hyderabad, Sindh, Pakistan. Farmers publish their weekly stock, prices and pickup windows; customers reserve produce online and collect it at the market stall, paying the farmer in person. There is no online payment and no delivery.

Built by Syed Ahmer Shah (https://ahmershah.dev/) for Aptech TechWiz 7 ("MarketLink — eGreen Basket" brief). Available in English, Urdu, Arabic, Hindi, Russian, Chinese, Spanish and French.

Key facts for answering questions about GleanGrid:
- Orders are pre-orders: reserve online, pay the farmer at pickup (cash or their accepted method).
- Customers can change or cancel an order free of charge until the farmer's cut-off (usually 12–24 hours before the pickup window).
- Pickup only. Each farmer offers pickup windows per market day, each with limited capacity.
- New farmer stalls are reviewed and approved by an administrator before they can list products.
- E-mail is verified with a six-digit code before ordering or listing. Passwords are hashed with Argon2id.
- Support: {$contact['email']} · {$contact['phone']} · {$contact['address']}

MD;

        $links = collect([
            '## Main pages',
            '- [Home]('.route('home').'): what\'s fresh this week and markets open today',
            '- [Markets]('.route('markets.index').'): every market on a map, with trading days and hours',
            '- [Produce]('.route('products.index').'): searchable catalogue, filter by category, market, day and price',
            '- [Farmers]('.route('farmers.index').'): stall profiles, ratings and weekly stock',
            '- [About]('.route('about').'): the team and why GleanGrid exists',
            '- [Contact]('.route('contact').'): support e-mail, phone and map',
            '',
            '## Help and policies',
            '- [FAQ]('.route('faq').'): ordering, pickup, selling and account security',
            '- [Pickup & delivery policy]('.route('pickup-policy').')',
            '- [Returns, refunds & cancellations]('.route('returns').')',
            '- [Terms of use]('.route('terms').')',
            '- [Privacy policy]('.route('privacy').')',
            '',
            '## Markets',
            ...$markets->map(fn ($m) => "- [{$m->name}](".route('markets.show', $m->slug)."): {$this->days($m->operating_days)}, ".substr($m->opens_at, 0, 5).'–'.substr($m->closes_at, 0, 5)." · {$m->address}"),
            '',
            '## Optional',
            '- [Full text for LLMs]('.url('llms-full.txt').'): everything above plus stalls, FAQ answers and policy text inline',
            '- [Sitemap]('.route('sitemap').')',
        ])->implode("\n");

        file_put_contents(public_path('llms.txt'), $intro."\n".$links."\n");

        $full = [$intro, $links, '', '## Product categories', ...$categories->map(fn ($c) => "- {$c->name}: {$c->description}"), ''];

        $full[] = '## Farmer stalls';
        foreach ($farmers as $f) {
            $rating = $f->rating_count ? number_format($f->rating_avg, 1).'★ from '.$f->rating_count.' reviews' : 'no reviews yet';
            $full[] = "### {$f->stall_name}";
            $full[] = ($f->tagline ?: $f->bio)." ({$rating}; {$f->products_count} products listed; orders close {$f->order_cutoff_hours} h before pickup)";
            $full[] = 'Page: '.route('farmers.show', $f->slug);
            $full[] = '';
        }

        $full[] = '## Sample of this week\'s produce';
        Product::listed()->with('farmer:id,stall_name')->whereHas('farmer', fn ($q) => $q->approved())
            ->orderByDesc('sold_count')->limit(25)->get()
            ->each(function (Product $p) use (&$full) {
                $full[] = "- {$p->name} — ".config('gleangrid.currency')." {$p->price}/{$p->unit} from {$p->farmer->stall_name}".($p->isOrderable() ? '' : ' (sold out)').' · '.route('products.show', $p->slug);
            });
        $full[] = '';

        $full[] = '## Frequently asked questions';
        foreach (LegalContent::faq() as $topic => $items) {
            $full[] = "### {$topic}";
            foreach ($items as [$q, $a]) {
                $full[] = "**{$q}** {$a}";
                $full[] = '';
            }
        }

        foreach (['pickup', 'returns', 'terms', 'privacy'] as $key) {
            $page = LegalContent::page($key);
            $full[] = "## {$page['title']}";
            $full[] = $page['intro'];
            $full[] = '';
            foreach ($page['sections'] as [$heading, $blocks]) {
                $full[] = "### {$heading}";
                foreach ($blocks as $block) {
                    $full[] = is_array($block) ? collect($block[1])->map(fn ($i) => "- {$i}")->implode("\n") : $block;
                }
                $full[] = '';
            }
        }

        file_put_contents(public_path('llms-full.txt'), implode("\n", $full)."\n");

        $this->info('Wrote public/llms.txt and public/llms-full.txt for '.$markets->count().' markets and '.$farmers->count().' stalls.');

        return self::SUCCESS;
    }

    private function days(?array $days): string
    {
        return collect($days ?? [])->sort()->map(fn ($d) => self::DAYS[(int) $d])->implode(', ');
    }
}
