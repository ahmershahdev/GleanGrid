import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { useEffect } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import PublicLayout from '@/Layouts/PublicLayout';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { ConfirmHost } from '@/lib/confirm';
import { loadLocale } from '@/lib/i18n';
import { consoleSignature } from '@/lib/console';
import { registerServiceWorker } from '@/lib/pwa';
import { installPrefetch } from '@/lib/prefetch';

const appName = 'GleanGrid';

function HydrationMark() {
    useEffect(() => {
        document.documentElement.dataset.hydrated = '1';
    }, []);
    return null;
}
const pages = import.meta.glob('./Pages/**/*.jsx');

const DASHBOARD = /^(Customer|Farmer|Admin|Account|Coupons)\//;

createInertiaApp({
    title: (title) => title || appName,
    resolve: (name) => pages[`./Pages/${name}.jsx`](),
    layout: (name) => {
        if (name.startsWith('Auth/')) return null;
        return DASHBOARD.test(name) && name !== 'Customer/Checkout' ? DashboardLayout : PublicLayout;
    },
    setup({ el, App, props }) {
        consoleSignature();
        registerServiceWorker();
        installPrefetch();
        const tree = (
            <>
                <App {...props} />
                <ConfirmHost />
                <HydrationMark />
            </>
        );
        loadLocale(props.initialPage.props.app?.locale ?? 'en').finally(() => {
            if (el.hasChildNodes()) hydrateRoot(el, tree);
            else createRoot(el).render(tree);
            const idle = () => window.dispatchEvent(new Event('gg:idle'));
            const later = () => ('requestIdleCallback' in window ? requestIdleCallback(idle, { timeout: 4000 }) : setTimeout(idle, 2500));
            if (document.readyState === 'complete') setTimeout(later, 1500);
            else window.addEventListener('load', () => setTimeout(later, 1500), { once: true });
        });
    },
    progress: { color: '#E2552C', showSpinner: false, delay: 350 },
});
