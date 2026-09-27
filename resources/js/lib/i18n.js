import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import baseEn, { additions as enAdditions } from '@/i18n/en';

const loaders = {
    ur: () => import('@/i18n/ur'),
    ar: () => import('@/i18n/ar'),
    hi: () => import('@/i18n/hi'),
    ru: () => import('@/i18n/ru'),
    zh: () => import('@/i18n/zh'),
    es: () => import('@/i18n/es'),
    fr: () => import('@/i18n/fr'),
};
function deepMerge(base, extra = {}) {
    const out = { ...base };
    for (const [key, value] of Object.entries(extra)) {
        out[key] = value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(base?.[key] ?? {}, value) : value;
    }
    return out;
}

const en = deepMerge(baseEn, enAdditions);
const dictionaries = { en };
const pending = {};
let version = 0;
const listeners = new Set();

export function loadLocale(locale) {
    if (dictionaries[locale] || !loaders[locale]) return Promise.resolve();
    pending[locale] ??= loaders[locale]()
        .then((mod) => {
            dictionaries[locale] = deepMerge(mod.default, mod.additions);
            version += 1;
            listeners.forEach((l) => l());
        })
        .catch(() => {
            delete pending[locale];
        });
    return pending[locale];
}

function useDictionaryVersion(locale) {
    useEffect(() => {
        loadLocale(locale);
    }, [locale]);
    return useSyncExternalStore(
        (l) => (listeners.add(l), () => listeners.delete(l)),
        () => version,
        () => version,
    );
}

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

export function useT() {
    const locale = useLocale();
    const loaded = useDictionaryVersion(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback((key, params, fallback) => translate(locale, key, params, fallback), [locale, loaded]);
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
