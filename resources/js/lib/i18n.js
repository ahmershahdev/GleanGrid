import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import en from '@/i18n/en';
import ur from '@/i18n/ur';
import ar from '@/i18n/ar';
import hi from '@/i18n/hi';
import ru from '@/i18n/ru';
import zh from '@/i18n/zh';
import es from '@/i18n/es';
import fr from '@/i18n/fr';

const dictionaries = { en, ur, ar, hi, ru, zh, es, fr };

// Extra Google Fonts per script; loaded only when that language is picked.
const localeFonts = {
    ur: 'family=Noto+Nastaliq+Urdu:wght@400..700&family=Noto+Naskh+Arabic:wght@400..700',
    ar: 'family=Reem+Kufi:wght@400..700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700',
    hi: 'family=Tiro+Devanagari+Hindi&family=Noto+Sans+Devanagari:wght@300..700',
    ru: 'family=Playfair+Display:ital,wght@0,400..900;1,400..900',
    zh: 'family=Noto+Serif+SC:wght@400..900&family=Noto+Sans+SC:wght@300..700',
};

function lookup(dict, key) {
    return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

export function translate(locale, key, params = {}, fallback) {
    if (!key) return '';
    let text = lookup(dictionaries[locale] ?? en, key) ?? lookup(en, key);
    if (typeof text !== 'string') {
        if (fallback !== undefined) return fallback;
        return key.includes('.') && !key.includes(' ') ? key.split('.').pop().replaceAll('_', ' ') : key;
    }
    for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`:${name}`, value ?? '');
    }
    return text;
}

export function useLocale() {
    return usePage().props.app?.locale ?? 'en';
}

/** `t('nav.markets')`, `t('orders.count', { count: 3 })`. Falls back to English, then the key. */
export function useT() {
    const locale = useLocale();
    return useCallback((key, params, fallback) => translate(locale, key, params, fallback), [locale]);
}

export function applyLocale(locale, locales) {
    const dir = locales?.[locale]?.dir ?? 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    const fonts = localeFonts[locale];
    if (fonts && !document.getElementById(`gg-font-${locale}`)) {
        const link = document.createElement('link');
        link.id = `gg-font-${locale}`;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?${fonts}&display=swap`;
        document.head.appendChild(link);
    }
}

/* ------------------------------------------------------------ Formatters */
const intlLocale = (locale) => `${locale === 'zh' ? 'zh-CN' : locale}-u-nu-latn`;

export function useFormat() {
    const { locale, currency } = usePage().props.app;
    const loc = intlLocale(locale);

    const number = (n, digits = 0) => new Intl.NumberFormat(loc, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(n) || 0);
    const money = (n) => `${currency} ${number(n, Number(n) % 1 ? 2 : 0)}`;
    const date = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Intl.DateTimeFormat(loc, opts).format(new Date(d.length === 10 ? `${d}T00:00:00` : d)) : '');
    const dateLong = (d) => date(d, { weekday: 'long', day: 'numeric', month: 'long' });
    const time = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':');
        return new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, +h, +m));
    };
    // 2026-01-04 was a Sunday, so day index 0..6 maps onto Jan 4..10.
    const day = (i, style = 'long') => new Intl.DateTimeFormat(loc, { weekday: style }).format(new Date(2026, 0, 4 + Number(i)));
    const days = (list, style = 'short') => (list ?? []).slice().sort().map((i) => day(i, style)).join(' · ');
    const relative = (d) => {
        const diff = (new Date(d).getTime() - Date.now()) / 1000;
        const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
        const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
        for (const [unit, secs] of units) {
            if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
        }
        return rtf.format(Math.round(diff), 'second');
    };

    return { number, money, date, dateLong, time, day, days, relative, currency };
}
