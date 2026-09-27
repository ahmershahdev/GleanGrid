# Security Model

To report a vulnerability, follow [SECURITY.md](https://github.com/ahmershahdev/GleanGrid/blob/main/SECURITY.md) — never a public issue.

## Authentication

- **Argon2id** hashing (64 MiB, 4 passes); legacy bcrypt hashes upgrade on next sign-in.
- Password policy: mixed case, number, symbol; production also rejects known-breached passwords.
- **E-mail verification** with a six-digit code: hashed, single-use, 15-minute life, 5 attempts, row-locked; failed attempts persist even when the request errors.
- New-device sign-in alert e-mails; password-change alerts; *sign out other devices* (database sessions).
- Session ID regenerated at sign-in; cookies encrypted, `HttpOnly`, `Secure`, `SameSite=Lax`.

## Authorisation

- `role:customer|farmer|admin` middleware on every private area; `verified` before ordering or listing; `farmer.approved` before a farmer can list or take orders.
- Ownership checks on orders, reviews, favourites and family links.

## Abuse and bots

Named rate limiters (per minute unless noted):

| Limiter | Limit | Used on |
|---|---|---|
| `login` | 10 | sign-in |
| `register` | 3 | sign-up |
| `password` | 3 | reset & password changes |
| `verify` | 6, 10/hour | code entry |
| `resend` | 1, 6/hour | code resend |
| `contact` | 3 | contact form |
| `assistant` | 20 | Basket Buddy |
| `search` | 120 | live search |
| `cart` | 90 | basket sync |
| `prefs` | 20 | language preference |
| `writes` | 60 | every customer/farmer write |

Plus account + IP lockout with growing cool-downs, and **BotGuard**: honeypot field, minimum form time, reCAPTCHA v2 checkbox on sign-up/contact/reset, invisible v3 on sign-in escalating to v2 on a low score.

## Browser hardening

- Per-request **nonce CSP** with `strict-dynamic`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`; `upgrade-insecure-requests` only over HTTPS.
- HSTS (preload-ready), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`. COOP is opt-in (`SECURITY_COOP=true`).

## Data integrity

- CSRF on every state change; the only exemption is the exact webhook path `webhooks/resend/inbound`, which requires a valid Svix HMAC signature and a timestamp within 5 minutes.
- Server-side price, stock, coupon and capacity calculation with row locks (see [[Order Lifecycle]]).
- Uploads: browser-side WebP compression, then server MIME/dimension/pixel checks, GD decode + re-encode (strips EXIF/GPS and trailing payloads), random names; SVG rejected.
- Eloquent bindings everywhere — no raw user input in SQL.

## Privacy

No card data, no advertising or analytics cookies, minimal retention (see the [Privacy Policy](https://gleangrid.ahmershah.dev/privacy)).

## Supply chain

CI runs `composer audit` and `npm audit --audit-level=high` on every push and pull request.
