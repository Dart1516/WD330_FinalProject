// /js/components/hamburger-menu.js
export function initHamburgerMenu({
    headerSel = '#site-header',
    toggleSel = '.menu-toggle',
    navSel = '#main-nav',
    desktopMQ = '(min-width: 901px)'
} = {}) {
    const header = document.querySelector(headerSel);
    const btn = header?.querySelector(toggleSel);
    const nav = document.querySelector(navSel);

    if (!header || !btn || !nav) return { destroy: () => { } };

    // --- Base a11y ---
    btn.setAttribute('aria-controls', nav.id || 'main-nav');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');

    const ac = new AbortController();
    const { signal } = ac;
    const mq = window.matchMedia(desktopMQ);
    let lastFocus = null;

    // Helpers ------------------------------------------------
    function setInert(el, on) {
        // Prevent focus/interaction while closed
        if ('inert' in el) el.inert = on;
        el.setAttribute('aria-hidden', String(on));
    }

    function setOpen(open) {
        header.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        setInert(nav, !open);

        if (open) {
            lastFocus = document.activeElement;
            const firstLink = nav.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
            firstLink?.focus({ preventScroll: true });
        } else {
            (lastFocus || btn).focus?.({ preventScroll: true });
        }
    }

    function toggle(force) {
        const open = typeof force === 'boolean' ? force : !header.classList.contains('open');
        setOpen(open);
    }

    // Disable transitions briefly to avoid flicker on MQ/orientation changes
    let noAnimTimer = null;
    function withNoAnim(fn, ms = 140) {
        header.classList.add('no-anim');
        try { fn(); } finally {
            clearTimeout(noAnimTimer);
            // remove after next paint + small buffer
            requestAnimationFrame(() => {
                noAnimTimer = setTimeout(() => header.classList.remove('no-anim'), ms);
            });
        }
    }

    // --- Initial state (critical to avoid first-frame flash) ---
    // On init we assume closed on mobile and interactive on desktop.
    if (!mq.matches) { // mobile at load
        header.classList.remove('open');
        setInert(nav, true);
    } else {
        // desktop: ensure nav is interactive
        setInert(nav, false);
    }

    // Events -------------------------------------------------
    btn.addEventListener('click', () => toggle(), { signal });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && header.classList.contains('open')) toggle(false);
    }, { signal });

    document.addEventListener('click', (e) => {
        if (!header.classList.contains('open')) return;
        if (!header.contains(e.target)) toggle(false);
    }, { signal });

    // When crossing breakpoint, close instantly and inertize for mobile
    mq.addEventListener?.('change', () => {
        withNoAnim(() => {
            if (mq.matches) {
                // Now desktop >=901px
                header.classList.remove('open');
                setInert(nav, false); // desktop nav should be interactive
            } else {
                // Now mobile <=900px
                setOpen(false);       // ensure closed
                setInert(nav, true);  // block paint/interaction
            }
        });
    }, { signal });

    // Also guard against quick orientation/resize bursts
    let resizeRAF = null;
    const onResize = () => {
        if (resizeRAF) return;
        resizeRAF = requestAnimationFrame(() => {
            resizeRAF = null;
            
            withNoAnim(() => {
                if (mq.matches) {
                    header.classList.remove('open');
                    setInert(nav, false);
                } else {
                    setOpen(false);
                    setInert(nav, true);
                }
            }, 120);
        });
    };
    window.addEventListener('orientationchange', onResize, { signal });
    window.addEventListener('resize', onResize, { signal });

    // bfcache restore (Safari/Firefox) can replay transitions—disable once
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) withNoAnim(() => {
            if (mq.matches) { setInert(nav, false); header.classList.remove('open'); }
            else { setOpen(false); setInert(nav, true); }
        }, 120);
    }, { signal });

    // Cleanup -----------------------------------------------
    function destroy() { ac.abort(); }
    return { destroy };
}
