# Getting Started

## Requirements

| Tool | Version | Notes |
|---|---|---|
| PHP | 8.2+ | extensions `pdo_mysql`, `mbstring`, `openssl`, `gd`, `intl`; enable OPcache for speed |
| Composer | 2.x | |
| Node.js | 20+ (22 recommended) | npm 10+ |
| Database | MySQL 8 or MariaDB 10.4+ | XAMPP works out of the box |

On Windows + XAMPP, enable `extension=gd` and `zend_extension=opcache` in `C:\xampp\php\php.ini`, then restart. In PowerShell use `npm.cmd` if script execution policy blocks `npm`.

## 1. Get the code and databases

```bash
git clone https://github.com/ahmershahdev/GleanGrid.git gleangrid
cd gleangrid
```

Create two empty databases (phpMyAdmin or CLI): `gleangrid` for the app and `gleangrid_test` for the test suite.

## 2. One-command setup

```bash
composer setup
```

This installs PHP and JS dependencies, copies `.env.example` to `.env`, **generates an app key only if none exists**, runs migrations and builds the front end.

## 3. Configure `.env` for local work

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
SESSION_SECURE_COOKIE=false     # cookies must work over plain http locally
MAIL_MAILER=log                 # e-mails go to storage/logs/laravel.log
QUEUE_CONNECTION=sync
# leave RECAPTCHA_* empty locally, or see Troubleshooting
```

Then `php artisan optimize:clear`.

## 4. Demo data and storage

```bash
php artisan db:seed        # 7 markets, 13 stalls, 50 products, orders, reviews, accounts
php artisan storage:link   # public URLs for uploaded photos
```

Prefer SQL? Import `database/sql/01_schema.sql` then `database/sql/02_seed_data.sql` into an empty database instead of migrating and seeding.

## 5. Run it

```bash
composer dev               # php artisan serve + queue:listen + pail logs + Vite HMR
# or, separately:
php artisan serve          # http://127.0.0.1:8000
npm run dev
```

## Demo accounts

| Role | E-mail | Password |
|---|---|---|
| Customer | `customer@gleangrid.test` | `Customer@123` |
| Farmer | `farmer@gleangrid.test` | `Farmer@123` |
| Admin | `admin@gleangrid.test` | `Admin@123` |

The sign-in page has one-tap tiles for each. Every `@gleangrid.test` account is pre-verified and never receives e-mail.

## Useful Artisan commands

| Command | What it does |
|---|---|
| `php artisan gleangrid:llms` | Regenerates `public/llms.txt` and `llms-full.txt` from live data |
| `php artisan gleangrid:export-sql` | Rewrites the SRS deliverable SQL scripts from the current schema and data |
| `php artisan test` | Runs the feature test suite against `gleangrid_test` |
| `php artisan optimize` / `optimize:clear` | Cache / clear config, routes and views |
