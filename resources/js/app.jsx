import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import PublicLayout from '@/Layouts/PublicLayout';
import DashboardLayout from '@/Layouts/DashboardLayout';

const appName = 'GleanGrid';
const pages = import.meta.glob('./Pages/**/*.jsx');

// Page folders that render inside the dashboard shell; auth pages carry their own layout.
const DASHBOARD = /^(Customer|Farmer|Admin|Account|Coupons)\//;

createInertiaApp({
    // Titles come fully formed from App\Support\Seo (40–60 chars incl. brand).
    title: (title) => title || appName,
    resolve: (name) => pages[`./Pages/${name}.jsx`](),
    // One stable layout component per shell, so the header, footer, smooth
    // scroll and cursor stay mounted between visits instead of re-rendering.
    layout: (name) => {
        if (name.startsWith('Auth/')) return null;
        return DASHBOARD.test(name) && name !== 'Customer/Checkout' ? DashboardLayout : PublicLayout;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#E2552C', showSpinner: false, delay: 120 },
});
