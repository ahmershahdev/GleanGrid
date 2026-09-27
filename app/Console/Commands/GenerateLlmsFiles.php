<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use App\Support\LegalContent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\URL;

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
- Orders are pre-orders: reserve online, pay the farmer at pickup (cash, bank transfer or mobile wallet — whatever the farmer accepts). GleanGrid never takes card details or commission.
- Customers can change or cancel an order free of charge until the farmer's cut-off. Each farmer sets it between 1 and 168 hours before the pickup window (usually 12–24 hours); it is shown on every order.
- Pickup only, no delivery. Each farmer offers pickup windows per market day, each with a capacity limit that cannot be overbooked.
- Stock is reserved the moment an order is placed. Checkout locks the stock, the coupon and the pickup window inside one database transaction, so the last item, a single-use coupon or the last pickup place can only ever go to one customer, even when many people order at the same instant. A farmer editing stock never erases sales made while the form was open.
- Order statuses: placed → accepted → ready → completed (or declined / cancelled, which release stock and return coupons).
- Customers show a QR pickup pass (or the order code, e.g. GG-7K2M9Q) at the stall; the farmer scans it with GleanGrid's Scan page. They check the produce and pay only for what they accept. Quality problems found at home are reported within 24 hours.
- A reminder e-mail with the pass is sent the evening before pickup. If an order is not collected, the farmer can mark it "not collected" after the window; repeated no-shows (default 3 in 60 days, set by admins) pause pre-ordering.
- Customers can download all their data (JSON) or delete their account themselves from Profile → Your data.
- New farmer stalls are reviewed and approved by an administrator before they can list products. Approval is not an organic or food-safety certification.
- Reviews can only be written on completed orders; farmers can reply publicly.
- Coupons (percentage or fixed) are issued by farmers or admins and re-checked on the server at checkout.
- E-mail is verified with a six-digit code before ordering or listing. Passwords are hashed with Argon2id; sign-ins from new devices trigger an e-mail alert.
- Basket Buddy, the on-site assistant, answers questions about market timings, farmer availability, pickup windows and products.
- Every product has a real photograph (public-domain / CC0) paired with a 3D illustration; product pages switch between the two.
- Search (Ctrl K or /) groups results into produce, farmers and markets, highlights matches and suggests corrections for misspellings.
- The site works as an installable app (PWA) with an offline page, has light and dark themes, and is rendered on the server for fast first loads.
- Fair use: every page is rate-limited per visitor, with tighter limits on sign-in, sign-up, search, checkout and other writes.
- Open source under the MIT licence: https://github.com/ahmershahdev/GleanGrid
- Support: {$contact['email']} · {$contact['phone']} · {$contact['address']}

MD;

        $links = collect([
            '## How ordering works',
            '1. Browse markets, farmers or produce and add items to the basket (no account needed to browse).',
            '2. Sign in with a verified account and pick a pickup window for each farmer at checkout.',
            '3. The farmer accepts the pre-order, packs it on market day and marks it ready — the customer is notified by e-mail and in the app.',
            '4. The customer shows the order code at the stall, checks the produce and pays the farmer directly.',
            '5. After pickup the customer can review the farmer and each product.',
            '',
            '## Who uses it',
            '- Customers: browse, filter by category (with item counts), price slider, market, market day and in-stock (a bottom sheet on phones), maps and directions, a basket grouped by stall with the next pickup time and undo, pre-orders, modify/cancel before cut-off, QR pickup pass, order history and reorder, favourites with restock alerts, family sharing, reviews.',
            '- Farmers: stall profile with map pin and markets, products with photos and weekly stock template, sold-out/unavailable states, pickup windows and cut-off, accept/decline/ready/complete orders, sales insights, review replies, coupons.',
            '- Administrators: platform metrics, approve/suspend stalls, activate/deactivate customers, markets and categories, listing and review moderation, reports with CSV export, announcements, coupons, contact inbox, an append-only audit log, platform settings (no-show rules, reminder hour, sign-up switches) and order overrides.',
            '',
            '## Main pages',
            '- [Home]('.route('home').'): what\'s fresh this week and markets open today',
            '- [Markets]('.route('markets.index').'): every market on a map, with trading days and hours',
            '- [Produce]('.route('products.index').'): searchable catalogue with real product photos; filter by category, price, market, market day and stock',
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

        $full[] = '## Markets in detail';
        foreach ($markets->load(['farmers' => fn ($q) => $q->approved()->orderBy('stall_name')]) as $m) {
            $full[] = "### {$m->name}";
            $full[] = trim(($m->description ? rtrim($m->description, '.').'. ' : '')."Trades {$this->days($m->operating_days)}, ".substr($m->opens_at, 0, 5).'–'.substr($m->closes_at, 0, 5).". Address: {$m->address}. Coordinates: {$m->latitude}, {$m->longitude}.");
            if ($m->farmers->isNotEmpty()) {
                $full[] = 'Stalls: '.$m->farmers->pluck('stall_name')->implode(', ').'.';
            }
            $full[] = 'Page: '.route('markets.show', $m->slug);
            $full[] = '';
        }

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
