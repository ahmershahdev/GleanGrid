<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class BotGuard
{
    public const HONEYPOT = 'website';

    public const STARTED = 'form_started_at';

    public const CHECKBOX_ACTIONS = ['register', 'contact', 'forgot', 'reset'];

    public static function check(Request $request, string $action): void
    {
        self::traps($request);

        if (! self::enabled()) {
            return;
        }

        if ($v2 = $request->input('captcha_v2')) {
            if (! self::verify($v2, config('services.recaptcha.v2_secret'), $request)['success']) {
                throw ValidationException::withMessages(['captcha' => 'captcha.failed']);
            }

            return;
        }

        if (self::v2Enabled() && in_array($action, self::CHECKBOX_ACTIONS, true)) {
            throw ValidationException::withMessages(['captcha' => 'captcha.required']);
        }

        if (! self::v3Enabled()) {
            return;
        }

        $result = self::verify((string) $request->input('captcha_token'), config('services.recaptcha.v3_secret'), $request);
        $score = (float) ($result['score'] ?? 0);
        $okAction = ($result['action'] ?? $action) === $action;

        if (! $result['success'] || ! $okAction || $score < config('services.recaptcha.min_score', 0.5)) {
            throw ValidationException::withMessages(['captcha' => 'captcha.challenge']);
        }
    }

    public static function traps(Request $request, bool $timed = true): void
    {
        if (filled($request->input(self::HONEYPOT))) {
            self::reject($request, 'honeypot');
        }

        if (! $timed) {
            return;
        }

        $started = (int) $request->input(self::STARTED);
        $elapsed = $started > 0 ? (now()->getTimestampMs() - $started) / 1000 : null;
        if ($elapsed !== null && $elapsed < config('services.recaptcha.min_seconds', 2)) {
            self::reject($request, 'too_fast');
        }
    }

    public static function enabled(): bool
    {
        return self::v3Enabled() || self::v2Enabled();
    }

    public static function v3Enabled(): bool
    {
        return filled(config('services.recaptcha.v3_site')) && filled(config('services.recaptcha.v3_secret'));
    }

    public static function v2Enabled(): bool
    {
        return filled(config('services.recaptcha.v2_site')) && filled(config('services.recaptcha.v2_secret'));
    }

    public static function clientConfig(): array
    {
        return [
            'v3' => self::v3Enabled() ? config('services.recaptcha.v3_site') : null,
            'v2' => self::v2Enabled() ? config('services.recaptcha.v2_site') : null,
        ];
    }

    private static function verify(string $token, ?string $secret, Request $request): array
    {
        if ($token === '' || blank($secret)) {
            return ['success' => false];
        }

        try {
            return Http::asForm()->connectTimeout(4)->timeout(8)
                ->withOptions(['force_ip_resolve' => 'v4'])
                ->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ])->json() ?? ['success' => false];
        } catch (Throwable $e) {
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
