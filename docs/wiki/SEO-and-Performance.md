# SEO and Performance

## Meta tags

`App\Support\Seo` resolves, per route, a **title (40–60 chars)** and **description (≈150–160 chars)** — hand-written for static pages, composed from whole sentences for markets, stalls and products. They are rendered server-side in `app.blade.php` and swapped client-side by `<Seo />` using matching `head-key`s.

Every page carries: `description`, `robots` (`noindex, nofollow` on private areas), canonical URL, Open Graph (`type`, `site_name`, `locale`, `title`, `description`, `url`, `image`, `image:secure_url`, `image:type`, `image:width/height` **1200×1200 (1:1)**, `image:alt`) and Twitter card tags.

## Structured data (JSON-LD)

- Everywhere: `Organization` (logo, contact point, address, founder, sameAs) and `WebSite` with a `SearchAction`.
- Every page: a `WebPage` node (`AboutPage`, `ContactPage`, `CollectionPage` for listings) with `dateModified` on policy pages, and a `BreadcrumbList` matching the visible breadcrumbs.
- `Product` with `Offer` (PKR price, availability, `OnSitePickup`) and `AggregateRating`.
- `Place` with `OpeningHoursSpecification` and geo for markets; `LocalBusiness` for stalls; `FAQPage` for the FAQ.

## Crawling

- `/sitemap.xml` — live, cached for an hour, with image entries for products and stalls.
- `/robots.txt` — public pages open; account areas, JSON endpoints and faceted duplicates closed; explicit rules for AI crawlers.
- `/llms.txt` and `/llms-full.txt` — AI-readable summaries generated from live data (`php artisan gleangrid:llms`).
- Mixed-case URLs and common aliases 301 to the canonical path.

## Performance

- Code-split pages; lazy maps (Leaflet), charts (Recharts), assistant and non-English dictionaries.
- **Hover/touch prefetch** of internal links, so navigation renders from cache.
- WebP everywhere (produce art 2.1 MB → 301 KB), fingerprinted immutable assets, fonts that never block first paint.
- Service worker caches assets and media (never HTML) and serves an offline page.
- OPcache on the server; database indexes matching dashboard queries; reporting views.

## Accessibility

Semantic landmarks, skip link, visible focus rings in both themes, ARIA on custom widgets (combobox search, listbox dropdowns, dialogs), full keyboard support, WCAG AA contrast tokens, and `prefers-reduced-motion` respected by every animation (smooth scroll, cursor, flights, theme reveal, back-to-top).
