<?php

return [
    'currency' => env('APP_CURRENCY', 'Rs'),

    'demo_domain' => env('DEMO_EMAIL_DOMAIN', 'gleangrid.test'),

    'security' => [
        'coop' => (bool) env('SECURITY_COOP', false),
    ],

    'locales' => [
        'en' => ['name' => 'English', 'native' => 'English', 'dir' => 'ltr'],
        'ur' => ['name' => 'Urdu', 'native' => 'اردو', 'dir' => 'rtl'],
        'ar' => ['name' => 'Arabic', 'native' => 'العربية', 'dir' => 'rtl'],
        'hi' => ['name' => 'Hindi', 'native' => 'हिन्दी', 'dir' => 'ltr'],
        'ru' => ['name' => 'Russian', 'native' => 'Русский', 'dir' => 'ltr'],
        'zh' => ['name' => 'Chinese', 'native' => '中文', 'dir' => 'ltr'],
        'es' => ['name' => 'Spanish', 'native' => 'Español', 'dir' => 'ltr'],
        'fr' => ['name' => 'French', 'native' => 'Français', 'dir' => 'ltr'],
    ],

    'contact' => [
        'email' => env('SUPPORT_EMAIL', 'support@ahmershah.dev'),
        'phone' => env('SUPPORT_PHONE', '+92 370 4831994'),
        'address' => 'Hyderabad, Sindh 71000, Pakistan',
        'latitude' => 25.3960,
        'longitude' => 68.3578,
    ],

    'social' => [
        'website' => 'https://ahmershah.dev/',
        'github' => 'https://github.com/ahmershahdev',
        'linkedin' => 'https://linkedin.com/in/syedahmershah',
        'x' => 'https://x.com/ahmershahdev',
        'facebook' => 'https://www.facebook.com/ahmershahdev',
    ],

    /* The write-ups about GleanGrid on the author's portfolio, plus the source code. */
    'project' => [
        'page' => 'https://ahmershah.dev/projects/gleangrid',
        'case_study' => 'https://ahmershah.dev/blogs/gleangrid-case-study-farmers-market-preorder-platform',
        'race_conditions' => 'https://ahmershah.dev/blogs/the-last-mango-problem-race-conditions-in-a-real-marketplace',
        'source' => 'https://github.com/ahmershahdev/GleanGrid',
    ],

];
