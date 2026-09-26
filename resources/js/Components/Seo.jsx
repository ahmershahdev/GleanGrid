import { Head, usePage } from '@inertiajs/react';

/**
 * Renders the `seo` prop resolved by App\Support\Seo. Keys match the
 * server-rendered tags in app.blade.php so each visit swaps them in place.
 */
export default function Seo() {
    const { seo, app } = usePage().props;
    if (!seo) return null;

    return (
        <Head>
            <title>{seo.title}</title>
            <meta head-key="description" name="description" content={seo.description} />
            <meta head-key="robots" name="robots" content={seo.robots} />
            <link head-key="canonical" rel="canonical" href={seo.url} />
            <meta head-key="og:type" property="og:type" content="website" />
            <meta head-key="og:site_name" property="og:site_name" content={seo.site} />
            <meta head-key="og:locale" property="og:locale" content={app?.locale ?? 'en'} />
            <meta head-key="og:title" property="og:title" content={seo.title} />
            <meta head-key="og:description" property="og:description" content={seo.description} />
            <meta head-key="og:url" property="og:url" content={seo.url} />
            <meta head-key="og:image" property="og:image" content={seo.image} />
            <meta head-key="og:image:width" property="og:image:width" content="1200" />
            <meta head-key="og:image:height" property="og:image:height" content="1200" />
            <meta head-key="og:image:alt" property="og:image:alt" content={seo.image_alt} />
            <meta head-key="twitter:card" name="twitter:card" content="summary" />
            <meta head-key="twitter:title" name="twitter:title" content={seo.title} />
            <meta head-key="twitter:description" name="twitter:description" content={seo.description} />
            <meta head-key="twitter:image" name="twitter:image" content={seo.image} />
        </Head>
    );
}
