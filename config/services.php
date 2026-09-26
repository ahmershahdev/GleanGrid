<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
        // Signing secret (whsec_...) of the webhook that receives inbound e-mail.
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

    // Google reCAPTCHA: invisible v3 scoring with a v2 checkbox fallback.
    // Leave the keys empty to rely on the honeypot + time trap only.
    'recaptcha' => [
        'v3_site' => env('RECAPTCHA_V3_SITE_KEY'),
        'v3_secret' => env('RECAPTCHA_V3_SECRET_KEY'),
        'v2_site' => env('RECAPTCHA_V2_SITE_KEY'),
        'v2_secret' => env('RECAPTCHA_V2_SECRET_KEY'),
        'min_score' => (float) env('RECAPTCHA_MIN_SCORE', 0.5),
        'min_seconds' => (int) env('BOT_MIN_FORM_SECONDS', 2),
    ],

];
