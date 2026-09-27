# Deployment

## Server checklist

- PHP 8.2+ with `pdo_mysql`, `mbstring`, `openssl`, `gd`, `intl`; **OPcache on** (≈0.7 s → 0.2 s responses in testing).
- MySQL 8 / MariaDB 10.4+ with a **least-privilege** user for the app database.
- Web root pointing at `public/`, HTTPS with a valid certificate.
- A process supervisor (Supervisor or systemd) for the queue worker.

## Environment

Copy `.env.example` to `.env` and set at least:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://gleangrid.ahmershah.dev
APP_KEY=              # php artisan key:generate — once, never rotate casually
DB_*                  # production credentials
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=database
MAIL_MAILER=resend    # plus RESEND_API_KEY; From address on a verified domain
RESEND_WEBHOOK_SECRET=whsec_...   # for inbound replies to the contact inbox
RECAPTCHA_V3_SITE_KEY / _SECRET_KEY, RECAPTCHA_V2_SITE_KEY / _SECRET_KEY
```

Secrets belong in the host's environment or `.env` on the server only — never in Git.

## Release steps

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build            # public/build/manifest.json must exist
php artisan migrate --force
php artisan storage:link           # first deploy only
php artisan optimize               # cache config, routes, views
php artisan gleangrid:llms --url=https://gleangrid.ahmershah.dev
php artisan queue:restart          # pick up new code in the worker
```

## Queue worker (Supervisor example)

```ini
[program:gleangrid-worker]
command=php /var/www/gleangrid/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=1
stopwaitsecs=3600
```

## After deploying

- Open `/`, `/sitemap.xml`, `/robots.txt`, `/llms.txt` and sign in as each role.
- Submit the sitemap in Google Search Console.
- Add the production domain to both reCAPTCHA keys.
- Point the Resend inbound webhook at `https://<domain>/webhooks/resend/inbound`.

## Backups

Schedule a nightly `mysqldump` (or managed DB snapshots) and copy `storage/app/public` (uploads). Practise a restore into a scratch database at least once.
