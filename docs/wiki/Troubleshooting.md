# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| reCAPTCHA box missing, or *"ERROR for site owner: Invalid domain for site key"* | Google treats `127.0.0.1` and `localhost` as different domains; *"Localhost is not supported by default"* if the one you're using isn't listed | Add `127.0.0.1` **and** `localhost` to both keys in the reCAPTCHA admin console, or browse at `http://localhost:8000` |
| Sign-in keeps demanding the checkbox | v3 failing (usually the same domain issue) escalates to v2 | Same as above |
| *419 Page expired* on every form | `SESSION_SECURE_COOKIE=true` on plain http, or production `.env` locally | Use local values (see [[Getting Started]]) then `php artisan optimize:clear` |
| *Vite manifest not found* | `public/build` is git-ignored and hasn't been built | `npm ci && npm run build` or `npm run dev` |
| *No application encryption key* | Empty `APP_KEY` | `php artisan key:generate` (only when empty) |
| Uploaded images 404 | Missing storage link (on Windows the junction may look broken but work) | `php artisan storage:link` |
| No e-mails | No provider configured, or a demo `@gleangrid.test` address | `MAIL_MAILER=log` and read `storage/logs/laravel.log` |
| E-mail is slow to send | `QUEUE_CONNECTION=sync` sends inside the request | Use `database` and run `php artisan queue:work` |
| `.env` changes ignored | Cached config | `php artisan optimize:clear` |
| Tests fail with missing tables | Stale `gleangrid_test` schema | Drop and recreate `gleangrid_test` (never the real DB) and rerun |
| `npm` blocked in PowerShell | Execution policy | Use `npm.cmd` |
| Paths like `/storage` mangled in Git Bash | MSYS path conversion | Prefix commands with `MSYS_NO_PATHCONV=1` |
| Lighthouse shows *NO_NAVSTART* | `Cross-Origin-Opener-Policy` enabled | Leave `SECURITY_COOP=false` while auditing |
