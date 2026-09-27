import clsx from 'clsx';
import { createPortal } from 'react-dom';

export const cn = (...args) => clsx(...args);

export const ORDER_STATUS_STYLE = {
    placed: 'bg-sun/20 text-[color:var(--warning)] ring-sun/40',
    accepted: 'bg-brand-soft text-brand ring-brand/25',
    ready: 'bg-lime/30 text-forest dark:text-lime ring-lime/60',
    completed: 'bg-success/15 text-success ring-success/30',
    declined: 'bg-danger/10 text-danger ring-danger/25',
    cancelled: 'bg-ink/5 text-ink-soft ring-line-strong',
    no_show: 'bg-danger/10 text-danger ring-danger/25',
};

export const PRODUCT_STATUS_STYLE = {
    available: 'bg-success/15 text-success ring-success/30',
    sold_out: 'bg-accent/15 text-accent ring-accent/30',
    unavailable: 'bg-ink/5 text-ink-soft ring-line-strong',
};

export const FARMER_STATUS_STYLE = {
    approved: 'bg-success/15 text-success ring-success/30',
    pending: 'bg-sun/20 text-[color:var(--warning)] ring-sun/40',
    suspended: 'bg-danger/10 text-danger ring-danger/25',
};

export const produceImage = (key) => `/images/produce/${key}.webp`;

export const googleDirections = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const osmDirections = (lat, lng) => `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lng}#map=15/${lat}/${lng}`;

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function clientPortal(node) {
    return typeof document === 'undefined' ? null : createPortal(node, document.body);
}

export function photoProps(url, sizes = '100vw') {
    if (!url) return {};
    if (!url.includes('/images/photos/')) return { src: url };
    const small = url.replace(/\.webp$/, '-960.webp');
    return { src: small, srcSet: `${small} 960w, ${url} 1920w`, sizes };
}
