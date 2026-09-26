import { router } from '@inertiajs/react';
import L from 'leaflet';
import { Crosshair, ExternalLink, LocateFixed, Navigation, Route as RouteIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useFormat, useT } from '@/lib/i18n';
import { cn, googleDirections, osmDirections } from '@/lib/utils';
import { Button } from '@/Components/ui';

// Hyderabad (Sindh) city centre — used when nothing else is known.
export const DEFAULT_CENTER = [25.396, 68.3578];

// Standard OpenStreetMap tiles (no API key). Dark mode is produced with a CSS filter in app.css.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Teardrop pin rendered as HTML so it needs no image assets. */
export function pinIcon({ color = '#1F4D36', image, label, active } = {}) {
    const inner = image
        ? `<img src="${image}" alt="" style="width:26px;height:26px;transform:rotate(45deg)"/>`
        : `<span style="transform:rotate(45deg);color:#fff;font:600 12px Geist,sans-serif">${label ?? ''}</span>`;
    const size = active ? 46 : 38;
    return L.divIcon({
        className: 'gg-pin',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
        html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px -4px rgba(0,0,0,.45);border:3px solid #fff;transition:all .2s">${inner}</div>`,
    });
}

const youIcon = L.divIcon({
    className: 'gg-pin',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: '<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:4px solid #fff;box-shadow:0 0 0 8px rgba(59,130,246,.25)"></div>',
});

function Tiles() {
    return <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} />;
}

function FitBounds({ points, route }) {
    const map = useMap();
    useEffect(() => {
        const all = [...points, ...(route ?? [])];
        if (all.length === 1) map.setView(all[0], 14);
        else if (all.length > 1) map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 15 });
    }, [map, JSON.stringify(points), route]);
    return null;
}

/**
 * markers: [{ id, lat, lng, title, subtitle, href, color, image, label }]
 */
export function MapView({ markers = [], className, activeId, onMarkerClick, route, you, scrollWheel = false, children }) {
    const points = useMemo(() => markers.filter((m) => m.lat != null && m.lng != null).map((m) => [m.lat, m.lng]), [markers]);

    return (
        <div className={cn('relative isolate overflow-hidden rounded-3xl border border-line', className)}>
            <MapContainer center={points[0] ?? DEFAULT_CENTER} zoom={12} scrollWheelZoom={scrollWheel} className="h-full w-full">
                <Tiles />
                <FitBounds points={points} route={route} />
                {markers.map((m) =>
                    m.lat == null ? null : (
                        <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon({ ...m, active: m.id === activeId })} eventHandlers={{ click: () => onMarkerClick?.(m) }}>
                            {m.title && (
                                <Popup>
                                    <p className="font-display text-base leading-tight">{m.title}</p>
                                    {m.subtitle && <p className="mt-1 text-xs text-ink-soft">{m.subtitle}</p>}
                                    {m.href && (
                                        <a
                                            href={m.href}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.visit(m.href);
                                            }}
                                            className="mt-2 inline-block text-xs font-semibold !text-brand"
                                        >
                                            {m.cta ?? 'Open'} →
                                        </a>
                                    )}
                                </Popup>
                            )}
                        </Marker>
                    ),
                )}
                {you && <Marker position={you} icon={youIcon} />}
                {route && <Polyline positions={route} pathOptions={{ color: '#E2552C', weight: 5, opacity: 0.9, lineCap: 'round' }} />}
                {children}
            </MapContainer>
        </div>
    );
}

/** Map + "route from my location" using the public OSRM demo router, plus deep links. */
export function DirectionsMap({ lat, lng, title, subtitle, className, color, image }) {
    const t = useT();
    const { number } = useFormat();
    const [you, setYou] = useState(null);
    const [route, setRoute] = useState(null);
    const [info, setInfo] = useState(null);
    const [state, setState] = useState('idle');

    const locate = () => {
        if (!navigator.geolocation) return setState('error');
        setState('loading');
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const from = [coords.latitude, coords.longitude];
                setYou(from);
                try {
                    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${lng},${lat}?overview=full&geometries=geojson`);
                    const json = await res.json();
                    const r = json.routes?.[0];
                    if (!r) throw new Error('no route');
                    setRoute(r.geometry.coordinates.map(([x, y]) => [y, x]));
                    setInfo({ km: r.distance / 1000, min: r.duration / 60 });
                    setState('done');
                } catch {
                    setRoute([from, [lat, lng]]);
                    setState('done');
                }
            },
            () => setState('error'),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    if (lat == null) return null;

    return (
        <div className={cn('space-y-3', className)}>
            <MapView className="h-72 md:h-80" markers={[{ id: 'dest', lat, lng, title, subtitle, color, image }]} route={route} you={you} />
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" onClick={locate} loading={state === 'loading'}>
                    <RouteIcon className="size-4" /> {t('map.route_from_me')}
                </Button>
                <a href={googleDirections(lat, lng)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium hover:bg-ink/5">
                    <Navigation className="size-4" /> Google Maps <ExternalLink className="size-3 opacity-50" />
                </a>
                <a href={osmDirections(lat, lng)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium hover:bg-ink/5">
                    OpenStreetMap <ExternalLink className="size-3 opacity-50" />
                </a>
                {info && (
                    <span className="ms-auto rounded-full bg-lime/30 px-3 py-1.5 text-sm font-medium text-forest dark:text-lime">
                        {t('map.route_info', { km: number(info.km, 1), min: Math.round(info.min) })}
                    </span>
                )}
                {state === 'error' && <span className="text-sm text-danger">{t('map.location_denied')}</span>}
            </div>
        </div>
    );
}

function ClickToPlace({ onPick }) {
    useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
    return null;
}

function Recenter({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView(position, Math.max(map.getZoom(), 14));
    }, [position?.[0], position?.[1]]);
    return null;
}

/** Click or drag to set latitude/longitude (farmers' stall pin, admin markets). */
export function LocationPicker({ lat, lng, onChange, className }) {
    const t = useT();
    const position = lat != null && lat !== '' ? [Number(lat), Number(lng)] : null;
    const set = (a, b) => onChange(Number(a.toFixed(7)), Number(b.toFixed(7)));

    const useMine = () => navigator.geolocation?.getCurrentPosition(({ coords }) => set(coords.latitude, coords.longitude));

    return (
        <div className={cn('space-y-2', className)}>
            <div className="relative isolate h-72 overflow-hidden rounded-3xl border border-line">
                <MapContainer center={position ?? DEFAULT_CENTER} zoom={position ? 14 : 11} scrollWheelZoom className="h-full w-full">
                    <Tiles />
                    <ClickToPlace onPick={set} />
                    <Recenter position={position} />
                    {position && (
                        <Marker
                            position={position}
                            draggable
                            icon={pinIcon({ color: '#E2552C', label: '●' })}
                            eventHandlers={{ dragend: (e) => set(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
                        />
                    )}
                </MapContainer>
                {!position && (
                    <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-ink px-4 py-1.5 text-xs text-bg">
                        <Crosshair className="me-1 inline size-3.5" /> {t('map.click_to_place')}
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                <button type="button" onClick={useMine} className="inline-flex items-center gap-1 font-medium text-brand">
                    <LocateFixed className="size-3.5" /> {t('map.use_my_location')}
                </button>
                {position && (
                    <span className="font-mono">
                        {position[0].toFixed(5)}, {position[1].toFixed(5)}
                    </span>
                )}
            </div>
        </div>
    );
}
