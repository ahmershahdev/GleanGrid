export function registerServiceWorker() {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;

    const register = () =>
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => {
                reg.addEventListener('updatefound', () => {
                    const next = reg.installing;
                    next?.addEventListener('statechange', () => {
                        if (next.state === 'installed' && navigator.serviceWorker.controller) next.postMessage('skip-waiting');
                    });
                });
            })
            .catch(() => {
            });

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
}
