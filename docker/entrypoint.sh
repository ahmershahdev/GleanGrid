#!/bin/sh
set -e

cd /var/www/html

if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is not set. Generate one with: docker compose run --rm app php artisan key:generate --show" >&2
    exit 1
fi

# Only the web container prepares the app; the SSR container just runs Node.
if [ "$1" = "apache2-foreground" ]; then
    php artisan storage:link --force >/dev/null 2>&1 || true

    if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
        tries=0
        until php artisan migrate --force; do
            tries=$((tries + 1))
            [ "$tries" -ge 20 ] && echo "Migrations failed." >&2 && exit 1
            echo "Waiting for the database..." >&2
            sleep 3
        done
    fi

    if [ "${SEED_DEMO_DATA:-false}" = "true" ] && [ "$(php artisan tinker --execute='echo \App\Models\User::count();')" = "0" ]; then
        php artisan db:seed --force
    fi

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
    chown -R www-data:www-data storage bootstrap/cache
fi

exec "$@"
