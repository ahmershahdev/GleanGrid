import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const load = () => import('@/Components/Map');
const MapView = lazy(() => load().then((m) => ({ default: m.MapView })));
const DirectionsMap = lazy(() => load().then((m) => ({ default: m.DirectionsMap })));

function Placeholder({ className, preview }) {
    return (
        <div className={cn('relative flex items-center justify-center overflow-hidden rounded-3xl border border-line bg-sunk', className)} aria-hidden="true">
            {preview ? <img src={preview} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" /> : <MapPin className="size-8 animate-pulse text-ink-faint" />}
        </div>
    );
}

function whenNear(Component, { fill = true, reserve = '' } = {}) {
    return function NearViewport(props) {
        const box = useRef(null);
        const [near, setNear] = useState(false);

        useEffect(() => {
            if (!('IntersectionObserver' in window)) return setNear(true);
            const io = new IntersectionObserver(([entry]) => entry.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '600px 0px' });
            io.observe(box.current);
            return () => io.disconnect();
        }, []);

        return (
            <div ref={box} className={props.className}>
                {near ? (
                    <Suspense fallback={<Placeholder className={fill ? 'size-full' : reserve} preview={props.preview} />}>
                        <Component {...props} className={fill ? 'size-full' : undefined} />
                    </Suspense>
                ) : (
                    <Placeholder className={fill ? 'size-full' : reserve} preview={props.preview} />
                )}
            </div>
        );
    };
}

export const LazyMapView = whenNear(MapView);
export const LazyDirectionsMap = whenNear(DirectionsMap, { fill: false, reserve: 'h-[21.5rem] md:h-[23.5rem]' });
const LocationPickerLazy = lazy(() => load().then((m) => ({ default: m.LocationPicker })));
export const LazyLocationPicker = whenNear(LocationPickerLazy, { fill: false, reserve: 'h-80' });
