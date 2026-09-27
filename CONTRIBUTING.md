# Contributing to GleanGrid

Thanks for helping make local food easier to find. GleanGrid is a Laravel 12 + Inertia 3 + React 19 app; this guide gets you from clone to merged pull request.

> **Be kind.** Farmers, shoppers and contributors come from very different backgrounds and languages. Harassment or discrimination of any kind isn't welcome in issues, pull requests or discussions.

## Ways to help

- **Report a bug** — open an issue with steps to reproduce, what you expected, what happened, and your browser/OS. Screenshots help.
- **Suggest a feature** — describe the problem first ("farmers can't …"), then your idea. Small, focused proposals move fastest.
- **Translate** — each language lives in `resources/js/i18n/<locale>.js`. Native speakers checking Urdu, Arabic, Hindi, Russian, Chinese, Spanish or French copy are especially valuable.
- **Improve docs** — README, the wiki and inline comments.
- **Fix an issue** — anything labelled `good first issue` or `help wanted` is ready to pick up. Comment on it so nobody duplicates the work.

Security problems are the one exception: **don't open a public issue** — follow [SECURITY.md](SECURITY.md).

## Local setup

Requirements: PHP 8.2+ (`pdo_mysql`, `mbstring`, `openssl`, `gd`), Composer 2, Node 20+, MySQL 8 or MariaDB 10.4+ (XAMPP is fine).

```bash
git clone https://github.com/<you>/GleanGrid.git && cd GleanGrid
# create empty databases `gleangrid` and `gleangrid_test`
composer setup           # install, .env, key (only if missing), migrate, build
php artisan db:seed      # demo data and accounts
composer dev             # server, queue, logs and Vite together
```

For local work set in `.env`: `APP_ENV=local`, `APP_DEBUG=true`, `APP_URL=http://127.0.0.1:8000`, `SESSION_SECURE_COOKIE=false`, `MAIL_MAILER=log`. Leave the reCAPTCHA keys empty — the honeypot and time trap still protect forms.

Demo accounts: `customer@gleangrid.test` / `Customer@123`, `farmer@gleangrid.test` / `Farmer@123`, `admin@gleangrid.test` / `Admin@123`.

## Workflow

1. Fork, then create a branch from `main`: `feat/stall-opening-hours`, `fix/cart-sync-race`, `docs/wiki-farmer-guide`.
2. Make the change **with a test** when behaviour changes (`tests/Feature/*`).
3. Run the checks below — CI runs the same ones.
4. Open a pull request using the template. Link the issue (`Fixes #123`), describe *why*, and add before/after screenshots for UI changes (light **and** dark, desktop **and** 375 px mobile).
5. A maintainer reviews. Please respond to comments with new commits rather than force-pushing, so the review history stays readable; we squash on merge.

## Checks before you push

```bash
vendor/bin/pint           # PHP code style (Laravel preset) — CI runs `pint --test`
php artisan test          # 50+ feature tests on a real MySQL database
npm run build             # must succeed; watch for new large chunks
```

## Code guidelines

**PHP / Laravel**
- Thin controllers: validate and authorise, then call a service (`app/Services`) for anything with business rules or concurrency.
- Anything that reads-then-writes shared state (stock, capacity, status) runs in `DB::transaction(..., attempts: 3)` with `lockForUpdate()`. Add a case to `RaceConditionTest` if you touch that logic.
- Notifications are queued and sent **after commit** (`$this->afterCommit()`).
- Every new route gets the right middleware (`auth`, `role:`, `verified`, a named `throttle:`) and appears in `App\Support\Seo` / `Breadcrumbs` if it is a page.
- Keep policy and FAQ copy in `App\Support\LegalContent`; it feeds the pages, JSON-LD and `llms-full.txt`. Only state rules the code actually enforces.

**React / JS**
- One page per screen in `resources/js/Pages`; shared UI in `resources/js/Components`.
- Use `<Link>` (or a plain `<a>`) for internal navigation — the global prefetcher in `lib/prefetch.js` makes it instant. Never `window.location` for in-app routes.
- Every user-facing string goes through `t('key')` and must exist in **all eight** locale files with the same `:placeholders`.
- Respect `prefers-reduced-motion`; give icon-only buttons an `aria-label`; keep focus visible.
- Colours come from the CSS tokens in `resources/css/app.css` — never hard-code a hex that won't adapt to dark mode.

**Database**
- Schema changes are new migrations, never edits to old ones. Add indexes that match the query, and `CHECK` constraints for impossible values.
- After a schema change, refresh the deliverable scripts: `php artisan migrate:fresh --seed && php artisan gleangrid:export-sql`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(checkout): let customers add a note for the farmer
fix(favorites): keep the header count in sync after a failed toggle
docs(wiki): add the farmer onboarding guide
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `style`, `chore`, `ci`, `i18n`.

## Licence

By contributing you agree that your work is released under the project's [MIT licence](LICENSE.txt).
