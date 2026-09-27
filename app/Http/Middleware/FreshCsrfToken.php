<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CSRF, beyond Laravel's defaults.
 *
 *  · A new token on every full page load. Laravel keeps one token for the whole session; here
 *    every document request (a refresh, a new tab, typing the URL) regenerates it with
 *    Str::random(40), i.e. PHP's CSPRNG (random_bytes). Inertia visits and JSON calls leave it
 *    alone. Nothing breaks in other open tabs: Inertia and lib/http.js read the XSRF-TOKEN cookie
 *    at the moment they send, and ValidateCsrfToken re-issues that cookie (encrypted with a fresh
 *    IV) on this very response, after this middleware has run.
 *  · Cross-site writes are refused outright. Browsers stamp every request with Sec-Fetch-Site;
 *    a POST/PUT/PATCH/DELETE marked `cross-site` cannot have come from our own pages, so it gets
 *    a 403 before it reaches a controller — a second wall behind the token (and behind SameSite=Lax).
 *    The payment gateway's return and Resend's webhook are cross-site by nature and exempt; both
 *    verify an HMAC signature instead.
 */
class FreshCsrfToken
{
    /** Paths that legitimately receive cross-site POSTs (same list as the CSRF exemptions). */
    public const CROSS_SITE_OK = ['webhooks/resend/inbound', 'payments/callback/*'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethodSafe() && $request->headers->get('Sec-Fetch-Site') === 'cross-site' && ! $request->is(...self::CROSS_SITE_OK)) {
            abort(403);
        }

        if ($this->isDocumentLoad($request) && $request->hasSession()) {
            $request->session()->regenerateToken();
        }

        return $next($request);
    }

    private function isDocumentLoad(Request $request): bool
    {
        if (! $request->isMethod('GET') || $request->header('X-Inertia') || $request->expectsJson() || $request->ajax()) {
            return false;
        }
        // prefetches / service-worker fetches are not a page the visitor is looking at
        $mode = $request->headers->get('Sec-Fetch-Mode');
        $dest = $request->headers->get('Sec-Fetch-Dest');

        return ($mode === null || $mode === 'navigate') && ($dest === null || $dest === 'document');
    }
}
