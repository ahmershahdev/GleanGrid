<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
        'webhook_secret' => env('RESEND_WEBHOOK_SECRET'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', '/auth/facebook/callback'),
    ],

    'recaptcha' => [
        'v3_site' => env('RECAPTCHA_V3_SITE_KEY'),
        'v3_secret' => env('RECAPTCHA_V3_SECRET_KEY'),
        'v2_site' => env('RECAPTCHA_V2_SITE_KEY'),
        'v2_secret' => env('RECAPTCHA_V2_SECRET_KEY'),
        'min_score' => (float) env('RECAPTCHA_MIN_SCORE', 0.5),
        'min_seconds' => (int) env('BOT_MIN_FORM_SECONDS', 2),
        'ticket_ttl' => (int) env('BOT_FORM_TTL_SECONDS', 7200),
    ],

    // Cloudflare Turnstile — the visible challenge (instead of the reCAPTCHA v2 checkbox) when set.
    'turnstile' => [
        'site' => env('TURNSTILE_SITE_KEY'),
        'secret' => env('TURNSTILE_SECRET_KEY'),
    ],

    'captcha' => [
        // which visible challenge to show when both are configured: turnstile | recaptcha
        'challenge' => env('CAPTCHA_CHALLENGE', 'turnstile'),
        // provider unreachable: let the request through (honeypot, ticket and limits still apply)
        'fail_open' => (bool) env('CAPTCHA_FAIL_OPEN', true),
    ],

];
