import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { renderToString } from 'react-dom/server';
import { route as ziggyRoute } from '../../vendor/tightenco/ziggy/dist/index.esm.js';
import PublicLayout from '@/Layouts/PublicLayout';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { loadLocale } from '@/lib/i18n';

process.env.TZ ||= 'Asia/Karachi';

const pages = import.meta.glob('./Pages/**/*.jsx');
const DASHBOARD = /^(Customer|Farmer|Admin|Account|Coupons)\//;

createServer(async (page) => {
    const url = new URL(page.props.ziggy?.location ?? page.url, 'http://localhost');
    const ziggy = { ...page.props.ziggy, location: { host: url.host, pathname: url.pathname, search: url.search } };
    globalThis.route = (name, params, absolute, config = ziggy) => ziggyRoute(name, params, absolute, config);

    await loadLocale(page.props.app?.locale ?? 'en');

    return createInertiaApp({
        page,
        render: renderToString,
        title: (title) => title || 'GleanGrid',
        resolve: (name) => pages[`./Pages/${name}.jsx`](),
        layout: (name) => {
            if (name.startsWith('Auth/')) return null;
            return DASHBOARD.test(name) && name !== 'Customer/Checkout' ? DashboardLayout : PublicLayout;
        },
        setup: ({ App, props }) => <App {...props} />,
    });
});
