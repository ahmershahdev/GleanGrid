<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Layered bot defence for public forms (sign-up, sign-in, contact, password reset):
 *
 *  1. Honeypot — a visually hidden field humans never fill.
 *  2. Time trap — the form must be open for a human-plausible time before submit.
 *  3. reCAPTCHA v3 — invisible score. A low score escalates to…
 *  4. reCAPTCHA v2 — the "I'm not a robot" checkbox, rendered by the client on demand.
 *
 * Google checks are skipped when keys are not configured (local dev, tests),
 * so the honeypot and time trap still protect every environment.
 */
class BotGuard
{
    public const HONEYPOT = 'website';

    public const STARTED = 'form_started_at';

    public static function check(Request $request, string $action): void
    {
        if (filled($request->input(self::HONEYPOT))) {
            self::reject($request, 'honeypot');
        }

        $started = (int) $request->input(self::STARTED);
        $elapsed = $started > 0 ? (int) (now()->getTimestampMs() - $started) / 1000 : null;
        if ($elapsed !== null && $elapsed < config('services.recaptcha.min_seconds', 2)) {
            self::reject($request, 'too_fast');
        }

        if (! self::enabled()) {
            return;
        }

        // A solved v2 checkbox always wins; otherwise score the invisible v3 token.
        if ($v2 = $request->input('captcha_v2')) {
            if (! self::verify($v2, config('services.recaptcha.v2_secret'), $request)['success']) {
                throw ValidationException::withMessages(['captcha' => 'captcha.failed']);
            }

            return;
        }

        $result = self::verify((string) $request->input('captcha_token'), config('services.recaptcha.v3_secret'), $request);
        $score = (float) ($result['score'] ?? 0);
        $okAction = ($result['action'] ?? $action) === $action;

        if (! $result['success'] || ! $okAction || $score < config('services.recaptcha.min_score', 0.5)) {
            // The client sees this key and shows the v2 checkbox instead of failing outright.
            throw ValidationException::withMessages(['captcha' => 'captcha.challenge']);
        }
    }

    public static function enabled(): bool
    {
        return filled(config('services.recaptcha.v3_site')) && filled(config('services.recaptcha.v3_secret'));
    }

    /** Keys the React side needs; shared via Inertia. */
    public static function clientConfig(): array
    {
        return [
            'enabled' => self::enabled(),
            'v3' => config('services.recaptcha.v3_site'),
            'v2' => config('services.recaptcha.v2_site'),
        ];
    }

    private static function verify(string $token, ?string $secret, Request $request): array
    {
        if ($token === '' || blank($secret)) {
            return ['success' => false];
        }

        try {
            return Http::asForm()->timeout(5)->post('https://www.google.com/recaptcha/api/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ])->json() ?? ['success' => false];
        } catch (Throwable $e) {
            // Google unreachable: fail open on v3 scoring but log it; honeypot/time trap still ran.
            Log::warning('reCAPTCHA verification unavailable', ['error' => $e->getMessage()]);

            return ['success' => true, 'score' => 1.0];
        }
    }

    private static function reject(Request $request, string $reason): never
    {
        Log::notice('Bot submission blocked', ['reason' => $reason, 'ip' => $request->ip(), 'path' => $request->path()]);

        throw ValidationException::withMessages(['captcha' => 'captcha.failed']);
    }
}
