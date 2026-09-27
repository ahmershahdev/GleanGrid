<?php

namespace App\Support;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Bot defence for every public form, in layers:
 *
 *  1. Honeypot: a field people never see. Anything typed into it is a bot.
 *  2. Form ticket: an encrypted, server-issued timestamp handed to the page with every render
 *     (a fresh random value on every refresh). A form sent back too fast, too late, or with a
 *     ticket that was forged, missing or edited is rejected. The old client-side timestamp could
 *     simply be set to "20 seconds ago" by a script; this one cannot.
 *  3. Invisible scoring: reCAPTCHA v3 when configured.
 *  4. Challenge: a visible check, either Cloudflare Turnstile or the reCAPTCHA v2 checkbox
 *     (CAPTCHA_CHALLENGE=turnstile|recaptcha; Turnstile wins when both are configured). It is
 *     required on sign-up, contact and password reset, and shown on sign-in only after a low v3
 *     score. Without v3, every guarded form shows the challenge.
 *
 * With no captcha keys at all, the honeypot + ticket still run.
 */
class BotGuard
{
    public const HONEYPOT = 'website';

    public const TICKET = 'form_ticket';

    public const CHECKBOX_ACTIONS = ['register', 'contact', 'forgot', 'reset'];

    public static function check(Request $request, string $action): void
    {
        self::traps($request);

        if (! self::enabled()) {
            return;
        }

        if ($token = $request->input('captcha_turnstile')) {
            if (! self::turnstileEnabled() || ! self::verifyTurnstile((string) $token, $action, $request)) {
                throw ValidationException::withMessages(['captcha' => 'captcha.failed']);
            }

            return;
        }

        if ($v2 = $request->input('captcha_v2')) {
            if (! self::v2Enabled() || ! self::verifyRecaptcha((string) $v2, config('services.recaptcha.v2_secret'), $request)['success']) {
                throw ValidationException::withMessages(['captcha' => 'captcha.failed']);
            }

            return;
        }

        if (self::challengeProvider() && (in_array($action, self::CHECKBOX_ACTIONS, true) || ! self::v3Enabled())) {
            throw ValidationException::withMessages(['captcha' => 'captcha.required']);
        }

        if (! self::v3Enabled()) {
            return;
        }

        $result = self::verifyRecaptcha((string) $request->input('captcha_token'), config('services.recaptcha.v3_secret'), $request);
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

        $issued = self::readTicket((string) $request->input(self::TICKET));
        if ($issued === null) {
            self::reject($request, 'bad_ticket');
        }

        $elapsed = (now()->getTimestampMs() - $issued) / 1000;
        if ($elapsed < config('services.recaptcha.min_seconds', 2)) {
            self::reject($request, 'too_fast');
        }
        if ($elapsed > config('services.recaptcha.ticket_ttl', 7200)) {
            throw ValidationException::withMessages(['captcha' => 'captcha.expired']);
        }
    }

    /**
     * A new ticket on every page render: the issue time plus random noise, encrypted and MAC'd
     * with APP_KEY (AES-256-CBC with a random IV, so no two tickets ever look alike).
     */
    public static function ticket(): string
    {
        return Crypt::encryptString(json_encode(['t' => now()->getTimestampMs(), 'n' => Str::random(16)]));
    }

    /** The issue time in ms, or null when the ticket is missing, forged or tampered with. */
    public static function readTicket(string $ticket): ?int
    {
        if ($ticket === '' || strlen($ticket) > 1024) {
            return null;
        }
        try {
            $data = json_decode(Crypt::decryptString($ticket), true, 4, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return null;
        }
        $t = is_array($data) ? ($data['t'] ?? null) : null;

        return is_int($t) && $t <= now()->getTimestampMs() + 5000 ? $t : null;
    }

    public static function enabled(): bool
    {
        return self::v3Enabled() || self::v2Enabled() || self::turnstileEnabled();
    }

    public static function v3Enabled(): bool
    {
        return filled(config('services.recaptcha.v3_site')) && filled(config('services.recaptcha.v3_secret'));
    }

    public static function v2Enabled(): bool
    {
        return filled(config('services.recaptcha.v2_site')) && filled(config('services.recaptcha.v2_secret'));
    }

    public static function turnstileEnabled(): bool
    {
        return filled(config('services.turnstile.site')) && filled(config('services.turnstile.secret'));
    }

    /** Which visible challenge the site shows: 'turnstile', 'recaptcha' or null. */
    public static function challengeProvider(): ?string
    {
        if (config('services.captcha.challenge', 'turnstile') === 'recaptcha' && self::v2Enabled()) {
            return 'recaptcha';
        }
        if (self::turnstileEnabled()) {
            return 'turnstile';
        }

        return self::v2Enabled() ? 'recaptcha' : null;
    }

    public static function clientConfig(): array
    {
        $challenge = self::challengeProvider();

        return [
            'v3' => self::v3Enabled() ? config('services.recaptcha.v3_site') : null,
            'v2' => $challenge === 'recaptcha' ? config('services.recaptcha.v2_site') : null,
            'turnstile' => $challenge === 'turnstile' ? config('services.turnstile.site') : null,
        ];
    }

    private static function verifyRecaptcha(string $token, ?string $secret, Request $request): array
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
                ])->throw()->json() ?? ['success' => false];
        } catch (Throwable $e) {
            return self::unavailable('reCAPTCHA', $e);
        }
    }

    private static function verifyTurnstile(string $token, string $action, Request $request): bool
    {
        if (strlen($token) > 2048) {
            return false;
        }

        try {
            $result = Http::asForm()->connectTimeout(4)->timeout(8)
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'secret' => config('services.turnstile.secret'),
                    'response' => $token,
                    'remoteip' => $request->ip(),
                    'idempotency_key' => (string) Str::uuid(),
                ])->throw()->json() ?? [];
        } catch (Throwable $e) {
            return self::unavailable('Turnstile', $e)['success'];
        }

        // a token minted for another form (or another site) is refused
        $okAction = blank($result['action'] ?? null) || $result['action'] === $action;
        $host = parse_url((string) config('app.url'), PHP_URL_HOST);
        $okHost = blank($result['hostname'] ?? null) || app()->isLocal() || $result['hostname'] === $host;

        return ($result['success'] ?? false) === true && $okAction && $okHost;
    }

    /**
     * The captcha provider could not be reached. Fail open by default (the honeypot, the ticket and
     * the rate limiters still apply) so an outage at Google or Cloudflare never locks real people
     * out; CAPTCHA_FAIL_OPEN=false turns that into a hard failure instead.
     */
    private static function unavailable(string $provider, Throwable $e): array
    {
        Log::warning("{$provider} verification unavailable", ['error' => $e->getMessage()]);

        return config('services.captcha.fail_open', true) ? ['success' => true, 'score' => 1.0] : ['success' => false];
    }

    private static function reject(Request $request, string $reason): never
    {
        Log::notice('Bot submission blocked', ['reason' => $reason, 'ip' => $request->ip(), 'path' => $request->path()]);

        throw ValidationException::withMessages(['captcha' => 'captcha.failed']);
    }
}
