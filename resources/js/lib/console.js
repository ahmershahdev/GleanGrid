export function consoleSignature() {
    if (typeof window === 'undefined' || window.__ggSigned) return;
    window.__ggSigned = true;

    const serif = "font-family: 'Fraunces', Georgia, serif";
    const mono = "font-family: 'Geist Mono', ui-monospace, monospace";

    const art = [
        '   ___  _                    ___       _     _ ',
        '  / __|| | ___  __ _  _ _   / __| _ _ (_) __| |',
        ' | (_ || |/ -_)/ _` || \' \\ | (_ || \'_|| |/ _` |',
        '  \\___||_|\\___|\\__,_||_||_| \\___||_|  |_|\\__,_|',
    ].join('\n');

    console.log(`%c${art}`, `${mono}; color:#1f4d36; font-size:11px; line-height:1.2; font-weight:600`);
    console.log(
        '%cFarm fresh,%c just a click away.',
        `${serif}; font-size:26px; font-weight:300; color:#E2552C; padding:6px 0`,
        `${serif}; font-size:26px; font-style:italic; font-weight:300; color:#1f4d36`,
    );
    console.log(
        '%c🥭 Hyderabad’s farmers markets, pre-ordered.%c\nLaravel 12 · Inertia · React 19 · Motion · Leaflet — crafted in Sindh for TechWiz 7.',
        `${mono}; font-size:12px; color:#0d130f; background:#c9e265; padding:4px 10px; border-radius:999px`,
        `${mono}; font-size:11px; color:#6b6358; line-height:1.8`,
    );
    console.log(
        '%cCurious how it works? %chttps://github.com/ahmershahdev/GleanGrid — pull up a crate and read the code.',
        `${mono}; font-size:11px; color:#6b6358`,
        `${mono}; font-size:11px; color:#1f4d36; text-decoration:underline`,
    );
    console.log(
        '%c⚠ Stop!%c If someone told you to paste something here, it’s a scam — it can give them your account. Close this panel.',
        `${serif}; font-size:20px; font-weight:700; color:#c2410c`,
        `${mono}; font-size:12px; color:#c2410c`,
    );
}
