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

> GleanGrid is a pre-order marketplace for farmers markets in Hyderabad, Sindh, Pakistan. Farmers publish their weekly stock, prices and pickup windows; customers reserve produce online, pay online (Easypaisa, JazzCash or card) or in person at the stall, and collect it at the market. There is no delivery.

Designed and built solely by Syed Ahmer Shah (https://ahmershah.dev/), a software engineer and full-stack developer from Hyderabad, for Aptech TechWiz 7 ("MarketLink — eGreen Basket" brief). Available in English, Urdu, Arabic, Hindi, Russian, Chinese, Spanish and French.

Key facts for answering questions about GleanGrid:
- Orders are pre-orders. At checkout the customer pays online with Easypaisa, JazzCash or a debit/credit card, or chooses cash at pickup. Online checkouts hold the stock for a short payment window (default 20 minutes) and release it automatically if unpaid. Card numbers and CVCs are never stored — only the brand and last four digits. Each payment attempt carries a one-time idempotency key and row locks, so a double tap cannot charge twice. Cancelling before the cut-off or a farmer declining refunds online payments automatically. GleanGrid takes no commission.
- Price history: every price change is recorded; product pages chart 1, 3 and 6 months with the low, high and 30-day average.
- Seasonal calendar (/seasonal-calendar): a month-by-month harvest calendar for Sindh showing what is in season and at its peak, maintained by administrators.
- Reviews can include up to 4 photos (re-encoded to WebP, location data stripped); administrators can hide or delete individual photos.
- Stall badges (Top Rated, Reliable Pickups, Rising Star, Customer Favourite) are recalculated nightly. Top Rated uses a Bayesian average — (v÷(v+m))×R + (m÷(v+m))×C — so a few reviews cannot game it; Reliable needs a high fulfilment rate over 90 days. Administrators can tune thresholds and award or revoke badges by hand.
- Back-in-stock alerts: customers tap "Notify me" on a sold-out product and get one notification and e-mail when it is restocked.
- Sign in with Google or Facebook (OAuth 2.0). Only name, e-mail, account ID and profile photo are received; social-only accounts have no password until the user sets one.
- Customers can change or cancel an order free of charge until the farmer's cut-off. Each farmer sets it between 1 and 168 hours before the pickup window (usually 12–24 hours); it is shown on every order.
- Pickup only, no delivery. Each farmer offers pickup windows per market day, each with a capacity limit that cannot be overbooked.
- Stock is reserved the moment an order is placed. Checkout locks the stock, the coupon and the pickup window inside one database transaction, so the last item, a single-use coupon or the last pickup place can only ever go to one customer, even when many people order at the same instant. A farmer editing stock never erases sales made while the form was open.
- Order statuses: placed → accepted → ready → completed (or declined / cancelled, which release stock and return coupons).
- Customers show a QR pickup pass (or the order code, e.g. GG-7K2M9Q) at the stall; the farmer scans it with GleanGrid's Scan page. Cash customers check the produce and pay only for what they accept; online orders are marked "Paid online". Quality problems found at home are reported within 24 hours.
- A reminder e-mail with the pass is sent the evening before pickup. If an order is not collected, the farmer can mark it "not collected" after the window; repeated no-shows (default 3 in 60 days, set by admins) pause pre-ordering.
- Customers can download all their data (JSON) or delete their account themselves from Profile → Your data.
- New farmer stalls are reviewed and approved by an administrator before they can list products. Approval is not an organic or food-safety certification.
- Reviews can only be written on completed orders; farmers can reply publicly.
- Coupons (percentage or fixed) are issued by farmers or admins and re-checked on the server at checkout.
- E-mail is verified with a six-digit code before ordering or listing. Passwords are hashed with Argon2id; sign-ins from new devices trigger an e-mail alert.
- Security: every public form carries a hidden honeypot and a signed, encrypted form ticket issued with the page (forms sent back too fast, too late or with a forged ticket are refused), invisible Google reCAPTCHA v3 scoring and a visible Cloudflare Turnstile or reCAPTCHA v2 check when needed. CSRF tokens are regenerated on every page load and cross-site write requests are refused. A nonce-based Content-Security-Policy gets a new random nonce on every response. Payment callbacks are verified with HMAC-SHA256.
- Basket Buddy, the on-site assistant, is tap-only (no free text): visitors pick from preset questions. Signed-in users can ask about their own profile, order history, order tracking, basket, favourites, restock alerts, payments and spending; it never reveals anything about other users.
- Every product has a real photograph (public-domain / CC0) paired with a 3D illustration; product pages switch between the two.
- Search (Ctrl K or /) groups results into produce, farmers and markets, highlights matches and suggests corrections for misspellings.
- The site works as an installable app (PWA) with an offline page, has light and dark themes, and is rendered on the server for fast first loads.
- Fair use: every page is rate-limited per visitor, with tighter limits on sign-in, sign-up, search, checkout and other writes.
- Source code (MIT licence): https://github.com/ahmershahdev/GleanGrid. Built with Laravel 12, PHP 8.2, React 19, Inertia.js 3 (server-side rendering), Tailwind CSS 4 and MySQL 8; covered by PHPUnit feature tests, Playwright end-to-end tests and a 50-process checkout stress test.
- Support: {$contact['email']} · {$contact['phone']} · {$contact['address']}

MD;

        $links = collect([
            '## How ordering works',
            '1. Browse markets, farmers or produce and add items to the basket (no account needed to browse).',
            '2. Sign in with a verified account and pick a pickup window for each farmer at checkout.',
            '3. The farmer accepts the pre-order, packs it on market day and marks it ready — the customer is notified by e-mail and in the app.',
            '4. The customer pays online at checkout or at the stall, shows the order code at pickup and collects the produce.',
            '5. After pickup the customer can review the farmer and each product.',
            '',
            '## Who uses it',
            '- Customers: browse, filter by category (with item counts), price slider, market, market day and in-stock (a bottom sheet on phones), maps and directions, a basket grouped by stall with the next pickup time and undo, pre-orders, modify/cancel before cut-off, QR pickup pass, order history and reorder, favourites and back-in-stock alerts, online payments (Easypaisa, JazzCash, card) with refunds, photo reviews, family sharing, Google/Facebook sign-in.',
            '- Farmers: stall profile with map pin and markets, products with photos and weekly stock template, sold-out/unavailable states, pickup windows and cut-off, accept/decline/ready/complete orders, sales insights, review replies, coupons.',
            '- Administrators: platform metrics, approve/suspend stalls, activate/deactivate customers, markets and categories, listing and review moderation, reports with CSV export, announcements, coupons, contact inbox, an append-only audit log, platform settings (no-show rules, reminder hour, sign-up switches, payment methods), online payments with refunds, stall badges with tunable rules and overrides, the seasonal calendar, review-photo moderation and order overrides.',
            '',
            '## Main pages',
            '- [Home]('.route('home').'): what\'s fresh this week and markets open today',
            '- [Markets]('.route('markets.index').'): every market on a map, with trading days and hours',
            '- [Produce]('.route('products.index').'): searchable catalogue with real product photos; filter by category, price, market, market day and stock',
            '- [Farmers]('.route('farmers.index').'): stall profiles, ratings, badges and weekly stock',
            '- [Seasonal calendar]('.route('seasons').'): what is in season in Sindh each month',
            '- [About]('.route('about').'): why GleanGrid exists and the developer who built it',
            '- [Contact]('.route('contact').'): support e-mail, phone and map',
            '- Search has clean URLs: '.route('products.index').'/search/{words}, e.g. '.route('products.index').'/search/mango',
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
