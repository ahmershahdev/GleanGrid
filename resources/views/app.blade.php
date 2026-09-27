@php
    $locale = app()->getLocale();
    $dir = config("gleangrid.locales.$locale.dir", 'ltr');
    $seo = $page['props']['seo'] ?? \App\Support\Seo::forRequest(request());
@endphp
<!DOCTYPE html>
<html lang="{{ $locale }}" dir="{{ $dir }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#F3EEE3" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0D130F" media="(prefers-color-scheme: dark)">

    <meta name="description" content="{{ $seo['description'] }}" data-inertia="description">
    <meta name="robots" content="{{ $seo['robots'] }}" data-inertia="robots">
    <link rel="canonical" href="{{ $seo['url'] }}" data-inertia="canonical">
    <meta property="og:type" content="website" data-inertia="og:type">
    <meta property="og:site_name" content="{{ $seo['site'] }}" data-inertia="og:site_name">
    <meta property="og:locale" content="{{ str_replace('-', '_', $locale) }}" data-inertia="og:locale">
    <meta property="og:title" content="{{ $seo['title'] }}" data-inertia="og:title">
    <meta property="og:description" content="{{ $seo['description'] }}" data-inertia="og:description">
    <meta property="og:url" content="{{ $seo['url'] }}" data-inertia="og:url">
    <meta name="author" content="Syed Ahmer Shah">
    <meta name="application-name" content="GleanGrid">
    <meta name="apple-mobile-web-app-title" content="GleanGrid">
    <meta name="format-detection" content="telephone=no">
    <meta property="og:image" content="{{ $seo['image'] }}" data-inertia="og:image">
    <meta property="og:image:secure_url" content="{{ $seo['image'] }}" data-inertia="og:image:secure_url">
    <meta property="og:image:type" content="image/jpeg" data-inertia="og:image:type">
    <meta property="og:image:width" content="1200" data-inertia="og:image:width">
    <meta property="og:image:height" content="1200" data-inertia="og:image:height">
    <meta property="og:image:alt" content="{{ $seo['image_alt'] }}" data-inertia="og:image:alt">
    <meta name="twitter:card" content="summary" data-inertia="twitter:card">
    <meta name="twitter:title" content="{{ $seo['title'] }}" data-inertia="twitter:title">
    <meta name="twitter:description" content="{{ $seo['description'] }}" data-inertia="twitter:description">
    <meta name="twitter:image" content="{{ $seo['image'] }}" data-inertia="twitter:image">
    <meta name="twitter:image:alt" content="{{ $seo['image_alt'] }}" data-inertia="twitter:image:alt">
    <meta name="twitter:creator" content="@ahmershahdev">

    <script type="application/ld+json" nonce="{{ Vite::cspNonce() }}">@json(\App\Support\Seo::jsonLd(request()), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)</script>

    <link rel="icon" href="/favicon.ico" sizes="48x48">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="preload" href="/images/brand/gleangrid-mark.webp" as="image" type="image/webp">

    <script nonce="{{ Vite::cspNonce() }}">
        (function () {
            try {
                var t = localStorage.getItem('gg-theme') || 'system';
                var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', dark);
                if (window.matchMedia('(pointer: fine)').matches) document.documentElement.classList.add('has-custom-scrollbar');
            } catch (e) {}
        })();
    </script>

    <link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>

    @routes(null, Vite::cspNonce())
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
    <title data-inertia="">{{ $seo['title'] }}</title>
    @inertiaHead
</head>
<body class="antialiased">
    @inertia
</body>
</html>
