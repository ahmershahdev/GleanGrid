let lenis = null;

export function setLenis(instance) {
    lenis = instance;
}

export function getLenis() {
    return lenis;
}

export function scrollToTop({ immediate = false } = {}) {
    if (lenis) {
        lenis.scrollTo(0, { immediate, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
        window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
    }
}

export function lockScroll(locked) {
    if (lenis) (locked ? lenis.stop() : lenis.start());
    document.documentElement.style.overflow = locked ? 'hidden' : '';
}
