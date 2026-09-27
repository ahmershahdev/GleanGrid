import { lazy, Suspense, useEffect, useState } from 'react';

const AssistantLazy = lazy(() => import('@/Components/Assistant'));

function useIdle(timeout = 2500) {
    const [idle, setIdle] = useState(false);
    useEffect(() => {
        const go = () => setIdle(true);
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(go, { timeout });
            return () => window.cancelIdleCallback(id);
        }
        const id = setTimeout(go, 1200);
        return () => clearTimeout(id);
    }, [timeout]);
    return idle;
}

export function DeferredAssistant() {
    const idle = useIdle();
    return idle ? (
        <Suspense fallback={null}>
            <AssistantLazy />
        </Suspense>
    ) : null;
}

export function AfterIdle({ children, timeout }) {
    const idle = useIdle(timeout);
    return idle ? children : null;
}
