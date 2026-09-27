<?php

namespace App\Support;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class Seo
{
    public const IMAGE = 'images/brand/gleangrid-og.jpg';

    private const NOINDEX = ['customer.', 'farmer.', 'admin.', 'profile.', 'notifications.', 'password.', 'verification.', 'dashboard', 'cart', 'login', 'register'];

    private const PAGES = [
        'home' => [
            'Fresh Hyderabad Produce, Straight From Local Farmers',
            'Pre-order this week’s harvest from Hyderabad’s farmers markets — mangoes, desi tomatoes, sourdough, raw honey — and collect it at the stall. Pay at pickup.',
        ],
        'markets.index' => [
            'Hyderabad Farmers Markets: Days, Hours & Map | GleanGrid',
            'Every farmers market in Hyderabad, Sindh on one live map. See which are trading today, their hours and which growers set up there, then plan your shop.',
        ],
        'farmers.index' => [
            'Meet Hyderabad’s Local Farmers & Growers | GleanGrid',
            'Browse the growers, bakers and beekeepers selling at Hyderabad’s markets. Read their stories and ratings, see what’s picked this week, and follow favourites.',
        ],
        'products.index' => [
            'Seasonal Fruit, Veg & Pantry Picks This Week | GleanGrid',
            'Shop what Sindh’s farmers harvested this week: seasonal vegetables, fruit, herbs, eggs, bread and honey. Filter by market, day or price and reserve for pickup.',
        ],
        'about' => [
            'Why We Built GleanGrid: Fair Trade for Local Farmers',
            'GleanGrid links Hyderabad households with the farmers who grow their food — fewer middlemen, less waste, fairer prices. Meet the team and see how it works.',
        ],
        'contact' => [
            'Contact GleanGrid: Questions, Stalls & Partnerships',
            'Questions about an order, want to sell at a market, or have an idea? Message the GleanGrid team in Hyderabad, Sindh — a real person reads and replies to all.',
        ],
        'cart' => [
            'Your Market Basket: Review Before You Pre-Order',
            'Check the produce you’ve reserved, adjust quantities and pick a pickup window at each farmer’s stall. Nothing is charged online — you pay at the market.',
        ],
        'login' => [
            'Sign In to GleanGrid: Orders, Favourites & Stalls',
            'Sign in to track your pre-orders, reorder the household basket and get restock alerts — or, if you’re a farmer, manage your stall and this week’s orders.',
        ],
        'register' => [
            'Join GleanGrid: Shop Local or Sell at Your Stall',
            'Create a free GleanGrid account to pre-order fresh produce from Hyderabad’s markets, or register your farm stall and take orders before market day arrives.',
        ],
        'password.request' => [
            'Reset Your GleanGrid Password in Under a Minute',
            'Forgot your password? Enter the e-mail on your GleanGrid account and we’ll send a secure link to choose a new one, so you can get back to your orders.',
        ],
        'password.reset' => [
            'Choose a New Password for Your GleanGrid Account',
            'Set a fresh, strong password for your GleanGrid account. Once saved, you’ll be signed straight back in to your orders, favourites and your stall tools.',
        ],
        'faq' => [
            'GleanGrid FAQ: Pre-Orders, Pickup & Selling Help',
            'Straight answers on how pre-orders, pickup windows, cut-offs, payments at the stall and selling as a farmer work on GleanGrid — plus account and security help.',
        ],
        'terms' => [
            'Terms of Use: The Ground Rules for GleanGrid',
            'The plain-language rules for using GleanGrid: accounts, pre-orders, cut-offs, farmer listings, reviews and fair use of the Hyderabad farmers-market platform.',
        ],
        'privacy' => [
            'Privacy Policy: What GleanGrid Collects and Why',
            'What personal data GleanGrid holds, why, who can see it and how long we keep it. No card data, no ad tracking, Argon2id-hashed passwords, and your rights.',
        ],
        'returns' => [
            'Returns, Refunds & Cancellations | GleanGrid',
            'Cancel free until the farmer’s cut-off, check produce at the stall before you pay, and what to do if something is wrong after pickup. Fresh food, fair fixes.',
        ],
        'pickup-policy' => [
            'Pickup & Delivery Policy: How Collection Works',
            'How GleanGrid pickup works: choose a window, get ready alerts, show your order code at the stall and pay the farmer directly. Why we are pickup-only by design.',
        ],
        'verification.notice' => [
            'Confirm Your E-mail to Start Using GleanGrid',
            'Enter the six-digit code we e-mailed you to confirm your address. It keeps order updates and pickup codes going to the right inbox and protects your account.',
        ],
    ];

    private const AREAS = [
        'customer.dashboard' => 'Your Market Week at a Glance',
        'customer.checkout' => 'Choose Pickup Windows & Confirm',
        'customer.orders.index' => 'Your Pre-Orders & Pickup Codes',
        'customer.orders.show' => 'Pre-Order Details & Pickup Code',
        'customer.orders.edit' => 'Change Your Pre-Order Before Cut-Off',
        'customer.reviews.index' => 'Reviews You’ve Left for Farmers',
        'customer.favorites.index' => 'Saved Produce, Stalls & Markets',
        'customer.family.index' => 'Family Sharing for Your Household',
        'farmer.dashboard' => 'Your Stall’s Week: Orders & Sales',
        'farmer.stall.edit' => 'Edit Your Public Stall Profile',
        'farmer.products.index' => 'Your Listings, Stock & Prices',
        'farmer.products.create' => 'List a New Product for This Week',
        'farmer.products.edit' => 'Update a Product Listing',
        'farmer.orders.index' => 'Incoming Pre-Orders to Prepare',
        'farmer.orders.show' => 'Pre-Order Packing List & Status',
        'farmer.slots.index' => 'Pickup Windows & Order Cut-Off',
        'farmer.reviews.index' => 'What Customers Say About You',
        'farmer.coupons.index' => 'Coupons & Offers for Your Stall',
        'admin.coupons.index' => 'Stall Coupons & Discount Codes',
        'admin.dashboard' => 'Platform Overview & Health',
        'admin.farmers.index' => 'Approve & Manage Farmer Stalls',
        'admin.farmers.show' => 'Farmer Stall Review & Status',
        'admin.customers.index' => 'Customer Accounts & Activity',
        'admin.markets.index' => 'Manage Markets & Map Locations',
        'admin.markets.create' => 'Add a New Farmers Market',
        'admin.markets.edit' => 'Edit Market Details & Hours',
        'admin.categories.index' => 'Product Categories & Ordering',
        'admin.moderation.products' => 'Listing Moderation Queue',
        'admin.moderation.reviews' => 'Review Moderation Queue',
        'admin.orders.index' => 'All Pre-Orders Across Markets',
        'admin.reports.index' => 'Sales & Activity Reports',
        'admin.announcements.index' => 'Site-Wide Announcements',
        'admin.messages.index' => 'Messages From the Contact Form',
        'admin.audit.index' => 'Audit Log of Administrative Actions',
        'admin.settings.edit' => 'Platform Settings & Rules',
        'admin.orders.show' => 'Order Details, History & Override',
        'farmer.scan' => 'Scan a Customer’s Pickup Pass',
        'profile.edit' => 'Your Profile, Language & Password',
        'notifications.index' => 'Your Order Notifications & Alerts',
    ];

    public static function forRequest(Request $request): array
    {
        $route = $request->route();
        $name = $route?->getName() ?? '';

        [$title, $description, $image] = match ($name) {
            'markets.show' => self::market($route->parameter('market')),
            'farmers.show' => self::farmer($route->parameter('farmer')),
            'products.show' => self::product($route->parameter('product')),
            default => self::static($name),
        };

        return [
            'breadcrumbs' => Breadcrumbs::for($route),
            'title' => $title,
            'description' => $description,
            'image' => asset($image ?? self::IMAGE),
            'image_alt' => 'GleanGrid — Hyderabad farmers markets, online',
            'url' => PathFilters::canonical($request),
            'robots' => $name === '' || Str::startsWith($name, self::NOINDEX) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
            'site' => 'GleanGrid',
        ];
    }

    private static function static(string $name): array
    {
        if ($name === '') {
            return [
                'This Page Wandered Off — Back to the Market | GleanGrid',
                'We couldn’t find the page you were after. It may have moved, or the stall has packed up for the week. Head back to the markets and see what’s fresh today.',
                null,
            ];
        }

        if (isset(self::PAGES[$name])) {
            return [...self::PAGES[$name], null];
        }

        $section = self::AREAS[$name] ?? 'Your GleanGrid Account';
        $area = match (true) {
            str_starts_with($name, 'admin.') => 'Admin',
            str_starts_with($name, 'farmer.') => 'Farmer',
            default => 'GleanGrid',
        };

        return [
            $area === 'GleanGrid' ? "{$section} | GleanGrid" : "{$section} · {$area} | GleanGrid",
            'Your private GleanGrid workspace for pre-orders, pickups and stall management across Hyderabad’s farmers markets. Sign in to see details for your account.',
            null,
        ];
    }

    private static function market(?Market $m): array
    {
        if (! $m) {
            return self::static('markets.index');
        }
        $days = collect($m->operating_days ?? [])->map(fn ($d) => now()->startOfWeek(0)->addDays((int) $d)->format('l'))->join(', ', ' & ');
        $hours = $m->opens_at && $m->closes_at ? substr($m->opens_at, 0, 5).'–'.substr($m->closes_at, 0, 5) : null;
        $where = str_contains($m->name, $m->city) ? $m->name : "{$m->name} in {$m->city}";

        return [
            self::fit("{$m->name}: Market Days, Hours & Farmers", ' | GleanGrid'),
            self::sentences([
                $where.($days ? " trades {$days}".($hours ? ", {$hours}" : '') : '').'.',
                'See which farmers set up here and what’s in stock this week.',
                'Pre-order online, collect at the stall.',
                'Directions included.',
            ]),
            null,
        ];
    }

    private static function farmer(?FarmerProfile $f): array
    {
        if (! $f) {
            return self::static('farmers.index');
        }

        return [
            self::fit("{$f->stall_name}: Fresh From the Farm", ' | GleanGrid'),
            self::sentences([
                $f->tagline ? rtrim($f->tagline, '.').'.' : "{$f->stall_name} sells at Hyderabad’s farmers markets.",
                'See this week’s harvest and honest customer reviews.',
                'Reserve online, pay at the stall.',
                'Follow them for restock alerts.',
            ]),
            null,
        ];
    }

    private static function product(?Product $p): array
    {
        if (! $p) {
            return self::static('products.index');
        }
        $p->loadMissing('farmer:id,stall_name');
        $price = config('gleangrid.currency').' '.rtrim(rtrim(number_format((float) $p->price, 2), '0'), '.');
        $by = $p->farmer?->stall_name;
        $desc = $p->description ? rtrim(strip_tags($p->description), '.').'.' : null;

        return [
            self::fit($by ? "{$p->name} by {$by}, {$price}/{$p->unit}" : "{$p->name}, {$price}/{$p->unit}", ' | GleanGrid'),
            self::sentences(array_filter([
                $desc,
                $by ? "Grown by {$by} and picked for this week’s Hyderabad market." : 'Picked for this week’s Hyderabad market.',
                "Reserve now at {$price}/{$p->unit} and pay at pickup.",
                'No online payment needed.',
            ])),
            null,
        ];
    }

    public static function jsonLd(Request $request): array
    {
        $route = $request->route();

        return self::schema($route?->getName() ?? '', $route);
    }

    private static function schema(string $name, $route): array
    {
        $social = array_values(config('gleangrid.social', []));
        $contact = config('gleangrid.contact');
        $graph = [
            [
                '@type' => 'Organization',
                '@id' => url('/#org'),
                'name' => 'GleanGrid',
                'url' => url('/'),
                'logo' => asset('icon-512.png'),
                'sameAs' => $social,
                'founder' => ['@type' => 'Person', 'name' => 'Syed Ahmer Shah', 'url' => config('gleangrid.social.website')],
                'contactPoint' => ['@type' => 'ContactPoint', 'email' => $contact['email'], 'telephone' => str_replace(' ', '', $contact['phone']), 'contactType' => 'customer support', 'areaServed' => 'PK', 'availableLanguage' => ['en', 'ur', 'ar', 'hi', 'ru', 'zh', 'es', 'fr']],
                'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'Hyderabad', 'addressRegion' => 'Sindh', 'postalCode' => '71000', 'addressCountry' => 'PK'],
            ],
            [
                '@type' => 'WebSite',
                '@id' => url('/#website'),
                'name' => 'GleanGrid',
                'url' => url('/'),
                'publisher' => ['@id' => url('/#org')],
                'inLanguage' => app()->getLocale(),
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => ['@type' => 'EntryPoint', 'urlTemplate' => route('products.index').'?q={search_term_string}'],
                    'query-input' => 'required name=search_term_string',
                ],
            ],
        ];

        $model = fn (string $key) => $route?->parameter($key);

        [$title, $description] = match ($name) {
            'markets.show' => self::market($model('market')),
            'farmers.show' => self::farmer($model('farmer')),
            'products.show' => self::product($model('product')),
            default => self::static($name),
        };
        $trail = Breadcrumbs::for($route);
        $isPublic = $trail && $trail[0]['key'] === 'nav.home';
        $graph[] = array_filter([
            '@type' => match ($name) {
                'contact' => 'ContactPage',
                'about' => 'AboutPage',
                'markets.index', 'farmers.index', 'products.index' => 'CollectionPage',
                default => 'WebPage',
            },
            '@id' => PathFilters::canonical(request()).'#webpage',
            'url' => PathFilters::canonical(request()),
            'name' => $title,
            'description' => $description,
            'inLanguage' => app()->getLocale(),
            'isPartOf' => ['@id' => url('/#website')],
            'primaryImageOfPage' => ['@type' => 'ImageObject', 'url' => asset(self::IMAGE), 'width' => 1200, 'height' => 1200],
            'breadcrumb' => $isPublic ? ['@id' => PathFilters::canonical(request()).'#breadcrumb'] : null,
            'dateModified' => in_array($name, ['terms', 'privacy', 'returns', 'pickup-policy', 'faq'], true) ? LegalContent::UPDATED : null,
            'about' => $name === 'home' ? ['@type' => 'Thing', 'name' => 'Farmers markets in Hyderabad, Sindh'] : null,
        ]);
        if ($isPublic) {
            $graph[] = [
                '@type' => 'BreadcrumbList',
                '@id' => PathFilters::canonical(request()).'#breadcrumb',
                'itemListElement' => collect($trail)->values()->map(fn ($c, $i) => [
                    '@type' => 'ListItem',
                    'position' => $i + 1,
                    'name' => $c['label'],
                    'item' => $c['url'],
                ])->all(),
            ];
        }

        if ($name === 'products.show' && ($p = $model('product')) instanceof Product) {
            $p->loadMissing('farmer:id,stall_name,slug', 'category:id,name');
            $graph[] = array_filter([
                '@type' => 'Product',
                'name' => $p->name,
                'description' => $p->description,
                'image' => $p->photo_url ?? $p->image_url,
                'category' => $p->category?->name,
                'brand' => ['@type' => 'Brand', 'name' => $p->farmer?->stall_name],
                'offers' => [
                    '@type' => 'Offer',
                    'price' => number_format((float) $p->price, 2, '.', ''),
                    'priceCurrency' => 'PKR',
                    'availability' => $p->isOrderable() ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    'url' => route('products.show', $p->slug),
                    'seller' => ['@type' => 'Organization', 'name' => $p->farmer?->stall_name],
                    'availableDeliveryMethod' => 'https://schema.org/OnSitePickup',
                ],
                'aggregateRating' => $p->rating_count > 0 ? ['@type' => 'AggregateRating', 'ratingValue' => $p->rating_avg, 'reviewCount' => $p->rating_count] : null,
            ]);
        }

        if ($name === 'markets.show' && ($m = $model('market')) instanceof Market) {
            $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            $graph[] = [
                '@type' => 'Place',
                'name' => $m->name,
                'description' => $m->description,
                'address' => ['@type' => 'PostalAddress', 'streetAddress' => $m->address, 'addressLocality' => 'Hyderabad', 'addressRegion' => 'Sindh', 'addressCountry' => 'PK'],
                'geo' => ['@type' => 'GeoCoordinates', 'latitude' => $m->latitude, 'longitude' => $m->longitude],
                'openingHoursSpecification' => collect($m->operating_days ?? [])->map(fn ($d) => [
                    '@type' => 'OpeningHoursSpecification',
                    'dayOfWeek' => 'https://schema.org/'.$dayNames[(int) $d],
                    'opens' => substr($m->opens_at, 0, 5),
                    'closes' => substr($m->closes_at, 0, 5),
                ])->values()->all(),
            ];
        }

        if ($name === 'farmers.show' && ($f = $model('farmer')) instanceof FarmerProfile) {
            $graph[] = array_filter([
                '@type' => 'LocalBusiness',
                'name' => $f->stall_name,
                'description' => $f->tagline ?: $f->bio,
                'image' => $f->logo_url,
                'url' => route('farmers.show', $f->slug),
                'geo' => $f->latitude ? ['@type' => 'GeoCoordinates', 'latitude' => $f->latitude, 'longitude' => $f->longitude] : null,
                'aggregateRating' => $f->rating_count > 0 ? ['@type' => 'AggregateRating', 'ratingValue' => $f->rating_avg, 'reviewCount' => $f->rating_count] : null,
            ]);
        }

        if ($name === 'faq') {
            $graph[] = [
                '@type' => 'FAQPage',
                'mainEntity' => collect(LegalContent::faq())->flatten(1)->map(fn ($qa) => [
                    '@type' => 'Question',
                    'name' => $qa[0],
                    'acceptedAnswer' => ['@type' => 'Answer', 'text' => $qa[1]],
                ])->values()->all(),
            ];
        }

        return ['@context' => 'https://schema.org', '@graph' => $graph];
    }

    private static function fit(string $title, string $suffix): string
    {
        $title = Str::limit($title, 60, '…');

        return mb_strlen($title.$suffix) <= 60 ? $title.$suffix : $title;
    }

    private static function sentences(array $parts, int $max = 160): string
    {
        $out = '';
        foreach ($parts as $part) {
            $part = trim(preg_replace('/\s+/', ' ', (string) $part));
            if ($part === '') {
                continue;
            }
            $next = $out === '' ? $part : "{$out} {$part}";
            if (mb_strlen($next) <= $max) {
                $out = $next;
            } elseif ($out === '') {
                $out = Str::of($part)->limit($max - 1, '')->beforeLast(' ')->rtrim(',;:—– ')->append('…')->toString();
            }
        }

        return $out;
    }
}
