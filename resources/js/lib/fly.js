import { prefersReducedMotion } from '@/lib/utils';

/*
 * "Fly to basket / fly to favourites".
 *
 * A ghost of the product image lifts off the button that was pressed, arcs
 * across the screen and drops into the header target, which then bumps.
 * Runs outside React (a detached ghost node), so no re-renders during the flight.
 */

function findTarget(name) {
    // Prefer the copy that is actually laid out (desktop header vs mobile menu).
    return [...document.querySelectorAll(`[data-fly-target="${name}"]`)].find((el) => el.getClientRects().length > 0);
}

function bump(el) {
    el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.35) rotate(-8deg)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
        { duration: 520, easing: 'cubic-bezier(0.16,1,0.3,1)' },
    );
}

const resolve = (x) => (typeof x === 'string' ? findTarget(x) : x);

/**
 * @param {Element|'cart'|'favorites'} fromArg  where the ghost lifts off
 * @param {Element|'cart'|'favorites'} toArg    where it lands (a named header target or any element)
 * @param {{ image?: string, icon?: string }} opts
 *
 * fly(button, 'cart')  — added to the basket
 * fly('cart', button)  — taken back out of the basket
 */
export function fly(fromArg, toArg, { image, icon } = {}) {
    const involvesHeader = typeof fromArg === 'string' || typeof toArg === 'string';
    // The header hides while scrolling down; ask it back so the ghost has somewhere to land/leave from.
    if (involvesHeader) window.dispatchEvent(new CustomEvent('gg:reveal-header'));
    const from = resolve(fromArg);
    const target = resolve(toArg);
    if (!from || !target) return;
    if (prefersReducedMotion()) return bump(target);

    const a = from.getBoundingClientRect();
    const size = 56;
    const start = { x: a.left + a.width / 2 - size / 2, y: a.top + a.height / 2 - size / 2 };

    const ghost = document.createElement('div');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: `${size}px`,
        height: `${size}px`,
        zIndex: '150',
        pointerEvents: 'none',
        borderRadius: '999px',
        display: 'grid',
        placeItems: 'center',
        background: toArg === 'favorites' ? 'var(--accent)' : 'var(--bg-elev)',
        boxShadow: '0 18px 40px -12px rgb(0 0 0 / 0.35)',
        border: '1px solid var(--line)',
        willChange: 'transform, opacity',
        transform: `translate(${start.x}px, ${start.y}px) scale(0.6)`,
    });
    if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.alt = '';
        Object.assign(img.style, { width: '78%', height: '78%', objectFit: 'contain' });
        ghost.appendChild(img);
    } else if (icon) {
        ghost.innerHTML = icon;
    }
    document.body.appendChild(ghost);

    const duration = 800;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const t0 = performance.now();

    // rAF rather than fixed keyframes: the target is re-measured every frame,
    // so the ghost still lands exactly while the header slides back in.
    const frame = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const t = ease(p);
        const b = target.getBoundingClientRect();
        const end = { x: b.left + b.width / 2 - size / 2, y: b.top + b.height / 2 - size / 2 };
        const lift = Math.max(120, Math.abs(end.x - start.x) * 0.35);
        const ctrl = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - lift };
        const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * ctrl.x + t ** 2 * end.x;
        const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * ctrl.y + t ** 2 * end.y;
        const scale = p < 0.15 ? 0.6 + p * 4 : 1.2 - p * 0.85;
        ghost.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${p * 220}deg)`;
        ghost.style.opacity = p > 0.92 ? String((1 - p) / 0.08) : '1';
        if (p < 1) requestAnimationFrame(frame);
        else {
            ghost.remove();
            bump(target);
        }
    };
    requestAnimationFrame(frame);
}

export const HEART_SVG =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" stroke="#fff" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
