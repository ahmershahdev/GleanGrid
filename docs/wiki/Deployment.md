# Deployment — Oracle Cloud (Always Free)

This guide puts GleanGrid on a free Oracle Cloud server with Nginx, PHP-FPM, MySQL 8, the Inertia SSR process, a queue worker and the scheduler, behind Cloudflare for HTTPS, caching and DDoS protection. Budget about an hour the first time.

**What you get for free:** an Ampere A1 (ARM) virtual machine with up to 4 CPU cores and 24 GB RAM, 200 GB of block storage and 10 TB of outbound traffic a month. GleanGrid runs comfortably on 2 cores and 12 GB.

---

## 1. Create the Oracle Cloud account

1. Sign up at **cloud.oracle.com** → *Start for free*. A card is needed only to verify identity; Always Free resources are never charged.
2. Choose your **home region** carefully — it cannot be changed later, and Always Free VMs live there. Pick one close to your visitors (for Pakistan: *UAE East (Dubai)*, *Saudi Arabia West (Jeddah)* or *India West (Mumbai)*).
3. Optional but recommended: once the account is active, upgrade it to **Pay As You Go**. You still pay nothing inside the Always Free limits, but Oracle stops reclaiming "idle" free VMs and A1 capacity is easier to get.

## 2. Create the network

1. Menu → **Networking → Virtual cloud networks → Start VCN Wizard → Create VCN with Internet Connectivity**. Name it `gleangrid-vcn` and accept the defaults.
2. Open the VCN → **Security Lists → Default Security List** → **Add Ingress Rules**:
   - Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port **80**.
   - Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port **443**.
   (Port 22 for SSH is already open.)

## 3. Create the server

1. Menu → **Compute → Instances → Create instance**.
2. **Image:** Canonical **Ubuntu 24.04** (the aarch64 build).
3. **Shape:** *Change shape* → **Ampere → VM.Standard.A1.Flex** → **2 OCPUs, 12 GB memory**.
   If you see "Out of capacity", try another availability domain or try again later.
4. **Networking:** the VCN and public subnet from step 2, *Assign a public IPv4 address* ticked.
5. **SSH keys:** *Generate a key pair for me* → **Save private key** (for example `gleangrid.key`).
6. **Boot volume:** 50 GB is plenty.
7. Create, wait for *Running*, and copy the **public IP**.
8. Recommended: Networking → **Reserved public IPs** → reserve one and attach it to the instance's VNIC, so the address survives a stop/start.

## 4. Connect and open the firewall inside Ubuntu

From your computer (PowerShell, Git Bash or a Mac/Linux terminal):

```bash
ssh -i gleangrid.key ubuntu@YOUR_SERVER_IP
```

(On Windows, if SSH complains about key permissions: right-click the key → Properties → Security → Advanced → disable inheritance and leave only your own user.)

**Oracle's Ubuntu images ship with iptables rules that block everything except SSH**, even after step 2. Open 80 and 443 on the server too:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Update the system and set the time zone:

```bash
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone Asia/Karachi
sudo apt -y install unattended-upgrades fail2ban
```

## 5. Install Nginx, PHP 8.3, MySQL 8, Node 22 and Composer

```bash
sudo apt -y install nginx mysql-server supervisor git unzip curl \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl \
  php8.3-zip php8.3-gd php8.3-intl php8.3-bcmath php8.3-opcache

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs

curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Check: `php -v` (8.3), `node -v` (22), `mysql --version` (8.0), `composer -V`.

## 6. Prepare MySQL

GleanGrid's migrations create **triggers and a stored procedure**. With binary logging on (the MySQL 8 default), a normal user may only do that when `log_bin_trust_function_creators` is enabled:

```bash
echo -e "[mysqld]\nlog_bin_trust_function_creators = 1" | sudo tee /etc/mysql/mysql.conf.d/gleangrid.cnf
sudo systemctl restart mysql
sudo mysql_secure_installation      # answer Y to the security questions
```

Create the database and a least-privilege user (choose a long random password):

```bash
sudo mysql
```

```sql
CREATE DATABASE gleangrid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gleangrid'@'localhost' IDENTIFIED BY 'CHANGE-ME-long-random-password';
GRANT ALL PRIVILEGES ON gleangrid.* TO 'gleangrid'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 7. Get the code

```bash
sudo mkdir -p /var/www && sudo chown ubuntu:www-data /var/www
cd /var/www
git clone https://github.com/ahmershahdev/GleanGrid.git gleangrid
cd gleangrid

composer install --no-dev --optimize-autoloader
npm ci
cp .env.example .env
php artisan key:generate
```

## 8. Configure `.env`

```bash
nano .env
```

Set at least:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://gleangrid.ahmershah.dev

DB_DATABASE=gleangrid
DB_USERNAME=gleangrid
DB_PASSWORD=CHANGE-ME-long-random-password

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_SECURE_COOKIE=true
LOG_LEVEL=warning

MAIL_MAILER=resend
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
MAIL_FROM_ADDRESS="support@ahmershah.dev"

RECAPTCHA_V3_SITE_KEY=...
RECAPTCHA_V3_SECRET_KEY=...
RECAPTCHA_V2_SITE_KEY=...
RECAPTCHA_V2_SECRET_KEY=...

TRUSTED_PROXIES=173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22
```

`TRUSTED_PROXIES` is Cloudflare's published IPv4 list (cloudflare.com/ips-v4). It lets Laravel see each visitor's real IP, so rate limits and sign-in lockouts apply per visitor instead of per Cloudflare server — and nobody else can fake an IP with an `X-Forwarded-For` header.

## 9. Build, migrate and set permissions

```bash
npm run build                      # client bundle + SSR bundle (bootstrap/ssr)
php artisan migrate --force --seed # drop --seed if you don't want the demo data
php artisan storage:link
php artisan gleangrid:llms
php artisan optimize

sudo chown -R ubuntu:www-data /var/www/gleangrid
sudo chmod -R ug+rwX storage bootstrap/cache
```

Turn on OPcache's production mode:

```bash
echo -e "opcache.enable=1\nopcache.memory_consumption=192\nopcache.max_accelerated_files=20000\nopcache.validate_timestamps=0" | sudo tee /etc/php/8.3/fpm/conf.d/99-gleangrid.ini
echo -e "upload_max_filesize=8M\npost_max_size=10M\nexpose_php=Off" | sudo tee -a /etc/php/8.3/fpm/conf.d/99-gleangrid.ini
sudo systemctl restart php8.3-fpm
```

(With `validate_timestamps=0`, PHP only sees new code after `sudo systemctl reload php8.3-fpm` — the deploy script in step 14 does that.)

## 10. Nginx

```bash
sudo nano /etc/nginx/sites-available/gleangrid
```

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name gleangrid.ahmershah.dev;
    root /var/www/gleangrid/public;
    index index.php;

    ssl_certificate     /etc/ssl/cloudflare/gleangrid.pem;
    ssl_certificate_key /etc/ssl/cloudflare/gleangrid.key;

    client_max_body_size 10M;
    charset utf-8;
    server_tokens off;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;

    location ~* ^/(build|fonts|images)/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known) { deny all; }
}
```

The certificate comes from Cloudflare in step 12. Enable the site after that step:

```bash
sudo ln -s /etc/nginx/sites-available/gleangrid /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 11. Keep the queue worker and the SSR server running

```bash
sudo nano /etc/supervisor/conf.d/gleangrid.conf
```

```ini
[program:gleangrid-queue]
command=php /var/www/gleangrid/artisan queue:work --sleep=3 --tries=3 --max-time=3600
user=www-data
numprocs=1
autostart=true
autorestart=true
stopwaitsecs=3600
stdout_logfile=/var/www/gleangrid/storage/logs/queue.log
redirect_stderr=true

[program:gleangrid-ssr]
command=php /var/www/gleangrid/artisan inertia:start-ssr
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/www/gleangrid/storage/logs/ssr.log
redirect_stderr=true
```

```bash
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl status          # both should say RUNNING
```

And the scheduler (weekly restock, pickup reminders), as `www-data`:

```bash
sudo crontab -u www-data -e
```

```cron
* * * * * cd /var/www/gleangrid && php artisan schedule:run >> /dev/null 2>&1
```

## 12. Domain, HTTPS and DDoS protection with Cloudflare (free)

1. Add `ahmershah.dev` to Cloudflare (free plan) if it isn't there yet, and switch the domain's nameservers to Cloudflare's.
2. **DNS → Add record:** type `A`, name `gleangrid`, IPv4 = your server IP, **Proxied** (orange cloud).
3. **SSL/TLS → Overview:** mode **Full (strict)**.
4. **SSL/TLS → Origin Server → Create Certificate** (RSA, 15 years, hostnames `gleangrid.ahmershah.dev`). Put the two parts on the server:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/gleangrid.pem     # paste the Origin Certificate
sudo nano /etc/ssl/cloudflare/gleangrid.key     # paste the Private Key
sudo chmod 600 /etc/ssl/cloudflare/gleangrid.key
```

Now run the three enable commands at the end of step 10.

5. **SSL/TLS → Edge Certificates:** *Always Use HTTPS* on, *Minimum TLS* 1.2.
6. **Security → Settings:** *Security level* Medium, *Bot Fight Mode* on. In an attack, flip *Under Attack Mode* on from the dashboard.
7. Optional hardening: only let Cloudflare reach the web ports, so nobody can bypass it by hitting the IP directly:

```bash
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  sudo iptables -I INPUT 6 -p tcp -s $ip -m multiport --dports 80,443 -j ACCEPT
done
sudo iptables -D INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -D INPUT -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 13. Connect the outside services

- **Google reCAPTCHA admin:** add `gleangrid.ahmershah.dev` to both keys (v3 and v2).
- **Resend:** verify the sending domain (add the DNS records it shows in Cloudflare, *DNS only*), then create a webhook to `https://gleangrid.ahmershah.dev/webhooks/resend/inbound` and put its signing secret in `RESEND_WEBHOOK_SECRET`.
- Open `https://gleangrid.ahmershah.dev`, sign in with a demo tile, place an order and check that the e-mail arrives (`storage/logs/queue.log` shows the queue worker at work).

## 14. Deploying updates

Save this as `/var/www/gleangrid/deploy.sh` and run `bash deploy.sh` after every push:

```bash
#!/usr/bin/env bash
set -e
cd /var/www/gleangrid
sudo -u www-data php artisan down --retry=15
git pull --ff-only
composer install --no-dev --optimize-autoloader
npm ci && npm run build
sudo chown -R ubuntu:www-data . && sudo chmod -R ug+rwX storage bootstrap/cache
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan optimize
sudo -u www-data php artisan gleangrid:llms
sudo systemctl reload php8.3-fpm
sudo supervisorctl restart gleangrid-queue gleangrid-ssr
sudo -u www-data php artisan up
```

## 15. Backups

Nightly database dump, kept for 14 days:

```bash
mkdir -p ~/backups
crontab -e
```

```cron
30 2 * * * mysqldump --single-transaction --routines --triggers -u gleangrid -p'CHANGE-ME-long-random-password' gleangrid | gzip > ~/backups/gleangrid-$(date +\%F).sql.gz && find ~/backups -name '*.sql.gz' -mtime +14 -delete
```

Also back up `/var/www/gleangrid/.env` and `storage/app/public` (uploaded photos) somewhere off the server. The Oracle console can also take free boot-volume backups (Block Storage → Boot volumes → Create backup).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser can't reach the site at all | Check both firewalls: the security list (step 2) **and** the iptables rules (step 4). |
| `SQLSTATE[HY000]: … log_bin_trust_function_creators` during migrate | Step 6: add the setting and restart MySQL, then run the migration again. |
| 502 Bad Gateway | `sudo systemctl status php8.3-fpm`; check the socket path in the Nginx config. |
| Pages work but look unstyled | `npm run build` was not run, or `public/build` is missing. |
| Every visitor seems to share one IP (rate limits trip early) | `TRUSTED_PROXIES` is missing or out of date — refresh it from cloudflare.com/ips-v4. |
| No e-mails | `sudo supervisorctl status`; `tail storage/logs/queue.log`; check `RESEND_API_KEY` and the verified domain. |
| 419 Page Expired | `APP_URL` must match the real https address and `SESSION_SECURE_COOKIE=true`. |
| Old code still served after a deploy | `sudo systemctl reload php8.3-fpm` (OPcache doesn't watch files in production). |
