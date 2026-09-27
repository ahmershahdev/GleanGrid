<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        if (str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            $response->headers->set('Content-Security-Policy', $this->policy($nonce, $request->isSecure()));
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), interest-cohort=()');
        if (config('gleangrid.security.coop')) {
            $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        }
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->remove('X-Powered-By');

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        return $response;
    }

    private function gatewayOrigin(): ?string
    {
        if (config('payments.mode') !== 'live' || blank(config('payments.jazzcash.merchant_id'))) {
            return null;
        }
        $url = parse_url((string) config('payments.jazzcash.endpoint'));

        return isset($url['scheme'], $url['host']) && $url['scheme'] === 'https' ? 'https://'.$url['host'] : null;
    }

    private function policy(string $nonce, bool $secure): string
    {
        $dev = app()->isLocal() && is_file(public_path('hot'))
            ? trim((string) file_get_contents(public_path('hot')))
            : null;
        $devWs = $dev ? preg_replace('#^http#', 'ws', $dev) : null;

        $directives = [
            'default-src' => ["'self'"],
            'script-src' => ["'self'", "'nonce-{$nonce}'", "'strict-dynamic'", 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/', $dev],
            'style-src' => ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', $dev],
            'font-src' => ["'self'", 'data:', 'https://fonts.gstatic.com'],
            'img-src' => ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://www.gstatic.com', 'https://www.google.com'],
            'connect-src' => ["'self'", 'https://router.project-osrm.org', 'https://www.google.com/recaptcha/', $dev, $devWs],
            'frame-src' => ['https://www.google.com', 'https://maps.google.com', 'https://www.openstreetmap.org', 'https://recaptcha.google.com'],
            'worker-src' => ["'self'", 'blob:'],
            'manifest-src' => ["'self'"],
            'object-src' => ["'none'"],
            'base-uri' => ["'self'"],
            'form-action' => ["'self'", $this->gatewayOrigin()],
            'frame-ancestors' => ["'self'"],
        ];

        $policy = collect($directives)
            ->map(fn ($sources, $name) => $name.' '.implode(' ', array_filter($sources)))
            ->implode('; ');

        return $secure ? $policy.'; upgrade-insecure-requests' : $policy;
    }
}
