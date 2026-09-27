# GleanGrid Wiki

**Farm fresh, just a click away.** GleanGrid is an open-source pre-order marketplace for the farmers markets of Hyderabad, Sindh. Farmers publish their weekly stock, prices and pickup windows; customers reserve produce online and collect it at the stall, paying the farmer in person.

🌐 Live: [gleangrid.ahmershah.dev](https://gleangrid.ahmershah.dev) · 📦 Code: [ahmershahdev/GleanGrid](https://github.com/ahmershahdev/GleanGrid) · ⚖️ [MIT licence](https://github.com/ahmershahdev/GleanGrid/blob/main/LICENSE.txt)

---

## Start here

| I want to… | Read |
|---|---|
| Run GleanGrid on my machine | [[Getting Started]] |
| Understand how it's built | [[Architecture]] · [[Database Design]] |
| Learn how an order moves | [[Order Lifecycle]] |
| Use it as a shopper | [[Customer Guide]] |
| Sell on it | [[Farmer Guide]] |
| Run the platform | [[Admin Guide]] |
| Know how it's protected | [[Security Model]] |
| Put it online | [[Deployment]] |
| Add a language or fix a translation | [[Internationalisation]] |
| Understand SEO, speed and accessibility work | [[SEO and Performance]] |
| Run the tests / CI | [[Testing and CI]] |
| Fix a problem | [[Troubleshooting]] |
| Contribute | [[Contributing]] |

## The idea in one minute

Shoppers rarely know which farmers will be at a market, what they'll bring, or at what price — so they arrive to sold-out stalls. Farmers can't take orders before market day, so they guess how much to pick. GleanGrid puts the week's stock online, lets customers reserve it against real inventory and choose a pickup window, and leaves payment where it has always been: at the stall, farmer to customer.

- **No online payment** and **no delivery** — by design (MarketLink SRS §1.5).
- **Three roles:** customer, farmer, administrator — each with its own dashboard.
- **Eight languages** including right-to-left Urdu and Arabic; light and dark themes.
- **Built for bursty market mornings:** row-level locks on stock and pickup capacity, idempotent toggles, after-commit notifications.

## Stack

Laravel 12 · PHP 8.2+ · Inertia.js 3 · React 19 · Tailwind CSS 4 · Vite 8 · Motion + Lenis · Leaflet / OpenStreetMap / OSRM · Recharts · MySQL 8 / MariaDB 10.4+ · Resend (e-mail).

## Project background

GleanGrid was built by **Syed Ahmer Shah** (with **Syed Hassan**) for the Aptech TechWiz 7 championship, answering the *MarketLink — eGreen Basket* brief.
