# Internationalisation

GleanGrid ships in **English, Urdu (RTL), Arabic (RTL), Hindi, Russian, Chinese, Spanish and French**.

## How it works

- Dictionaries live in `resources/js/i18n/<locale>.js` as nested objects.
- English is bundled; every other language is its own chunk, fetched once — before the first paint for returning visitors, or when the switcher is used (`lib/i18n.js`).
- `useT()` returns `t(key, params, fallback)`; placeholders use `:name` syntax: `t('farmers.eyebrow', { count: 11 })` → "11 growers".
- `useFormat()` gives locale-aware numbers, currency, dates, times, weekday names and relative time.
- `<html lang dir>` is set server-side from the session/user locale (`SetLocale` middleware), so RTL layouts render correctly on first paint. Components use logical properties (`ms-*`, `pe-*`, `start-*`) and `rtl-flip` for directional icons.
- Each script gets suitable fonts (Noto Nastaliq Urdu, Reem Kufi, Tiro Devanagari, Noto Serif SC…), loaded only when that language is chosen.
- Policy pages are published in English as the governing version and say so in other languages.

## Adding or fixing a string

1. Add the key to `en.js`.
2. Add the same key, with the same `:placeholders`, to the seven other files.
3. Use it: `t('section.key')`.

## Adding a language

1. Create `resources/js/i18n/<code>.js` by copying `en.js` and translating.
2. Register a loader in `lib/i18n.js` (and optional fonts in `localeFonts`).
3. Add the locale to `config/gleangrid.php → locales` with its native name and `dir`.
4. Test the switcher, RTL (if applicable), dates and currency.
