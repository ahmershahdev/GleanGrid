# Testing and CI

## Running tests

```bash
php artisan test                         # all tests
php artisan test --filter=RaceCondition  # one class
php artisan test --filter=checkout       # by name
```

Tests use a real MySQL/MariaDB database called `gleangrid_test` (see `phpunit.xml`) with `RefreshDatabase` and the demo seeder — **never point it at your real database**. reCAPTCHA keys are blanked and mail uses the `array` driver.

## What's covered

| Suite | Focus |
|---|---|
| `OrderFlowTest` | place → accept → ready → complete → review; stock and cut-off rules |
| `RaceConditionTest` | concurrent checkout, stale cancel vs. accept, full pickup windows, duplicate lines, idempotent favourites, DB CHECK constraints |
| `SecurityTest` | OTP flow and limits, honeypot/time trap, password policy, lockout, new-device alerts, bcrypt→Argon2id, CSP headers, policy pages |
| `CouponTest` | ownership, limits, server-side totals, redemption rollback |
| `InboxTest` | webhook signatures, replay window, contact inbox replies |
| `PagesTest` | every page for every role, role isolation, search, uploads, throttling, case-insensitive URLs and aliases, filters serialisation |

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

1. MySQL 8 service with an empty `gleangrid_test`.
2. PHP 8.2 and 8.3 matrix, Node 22.
3. `composer install`, `npm ci`, `npm run build` (fails if the Vite manifest is missing).
4. `vendor/bin/pint --test` (code style).
5. `php artisan test`.
6. A separate job runs `composer audit` and `npm audit --audit-level=high`.

## Manual release smoke test

- Guest: browse → basket → sign-in prompt at checkout.
- Customer: checkout two farmers → modify one → cancel one → confirm e-mails/alerts.
- Farmer: accept → ready → complete; reply to a review; apply weekly template.
- Admin: approve a pending stall, hide a review, export a CSV report.
- Switch to Urdu (RTL) and dark mode; test at 375 px width and keyboard-only.
