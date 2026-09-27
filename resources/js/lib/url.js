const KEYS = {
    search: 'q',
    category: 'category',
    market: 'market',
    city: 'city',
    near: 'near',
    day: 'day',
    price: 'price',
    status: 'status',
    method: 'method',
    badge: 'badge',
    'max-rating': 'max_rating',
    action: 'action',
    date: 'date',
    from: 'from',
    to: 'to',
    sort: 'sort',
    page: 'page',
};

const FLAGS = {
    'in-stock': ['in_stock', '1'],
    household: ['household', '1'],
    removed: ['removed', '1'],
    hidden: ['hidden', '1'],
    unanswered: ['filter', 'unanswered'],
};

const ORDER = ['search', 'category', 'market', 'city', 'near', 'day', 'price', 'in-stock', 'status', 'method', 'badge', 'household', 'removed', 'hidden', 'unanswered', 'max-rating', 'action', 'date', 'from', 'to', 'sort', 'page'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SORTS = { price_asc: 'price-low', price_desc: 'price-high', rating: 'top-rated', name: 'a-z' };

const blank = (v) => v === undefined || v === null || v === '' || v === false;
const num = (n, d = 2) => String(Number(Number(n).toFixed(d)));

function encode(key, p) {
    switch (key) {
        case 'search': {
            if (blank(p.q)) return null;
            const text = String(p.q).replace(/[\s/\\?#]+/gu, ' ').trim();
            return text ? encodeURIComponent(text.replace(/ /g, '-')) : null;
        }
        case 'day':
            return blank(p.day) ? null : (DAYS[Number(p.day)] ?? null);
        case 'sort':
            return blank(p.sort) || p.sort === 'featured' ? null : (SORTS[p.sort] ?? String(p.sort).replace(/_/g, '-'));
        case 'status':
            return blank(p.status) ? null : String(p.status).replace(/_/g, '-');
        case 'price':
            if (blank(p.min) && blank(p.max)) return null;
            return `${blank(p.min) ? '0' : num(p.min)}-${blank(p.max) ? 'up' : num(p.max)}`;
        case 'near':
            return blank(p.lat) || blank(p.lng) ? null : `${num(p.lat, 4)},${num(p.lng, 4)}`;
        case 'page':
            return Number(p.page) > 1 ? String(Number(p.page)) : null;
        default:
            return blank(p[KEYS[key]]) ? null : encodeURIComponent(String(p[KEYS[key]]));
    }
}

export function filterPath(params = {}) {
    const parts = [];
    for (const key of ORDER) {
        if (FLAGS[key]) {
            const [param, value] = FLAGS[key];
            if (!blank(params[param]) && String(params[param] === true ? 1 : params[param]) === value) parts.push(key);
            continue;
        }
        const value = encode(key, params);
        if (value) parts.push(key, value);
    }
    return parts.join('/');
}

export function pathUrl(name, params = {}, routeParams = undefined) {
    const base = route(name, routeParams).replace(/\/$/, '');
    const segments = filterPath(params);
    return segments ? `${base}/${segments}` : base;
}
