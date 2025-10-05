// js/components/load-header-footer.js

/**
 * Fetch a partial and return text (throws on non-OK).
 */
async function fetchPartial(url) {
    const res = await fetch(url, { cache: "no-cache" }); // dev-friendly
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.text();
}

/**
 * Key extractor: compare by filename ("index.html", "heroes-list.html", etc.).
 * This tolerates "/", "/index.html", y subcarpetas.
 */
function pathKey(pathname) {
    if (!pathname || pathname === "/") return "index.html";
    const clean = pathname.replace(/\/+$/, "");          // quita slash final
    const last = clean.split("/").pop();                 // último segmento
    return (last && last.length) ? last.toLowerCase() : "index.html";
}

/**
 * Set active nav link based on current location.
 */
function setActiveNavLink(headerRoot) {
    const currentKey = pathKey(window.location.pathname);

    // SOLO links del menú principal (no el logo)
    const navLinks = headerRoot.querySelectorAll('#main-nav a[href^="/"]:not([target="_blank"])');
    // Links internos en el área de acciones (p.ej., /pages/login.html)
    const actionLinks = headerRoot.querySelectorAll('.header-actions a[href^="/"]:not([target="_blank"])');

    const all = [...navLinks, ...actionLinks];

    // Reset
    all.forEach(a => {
        a.removeAttribute('aria-current');
        a.classList.remove('is-active');
    });

    // 1) Intentar en el menú primero (para que no gane el logo)
    let best = Array.from(navLinks).find(a => {
        const hrefKey = pathKey(new URL(a.href, window.location.origin).pathname);
        return hrefKey === currentKey;
    });

    // 2) Si no hubo match en el menú, intentar en el área de acciones
    if (!best) {
        best = Array.from(actionLinks).find(a => {
            const hrefKey = pathKey(new URL(a.href, window.location.origin).pathname);
            return hrefKey === currentKey;
        });
    }

    // 3) Fallback adicional para la home
    if (!best && currentKey === 'index.html') {
        best = Array.from(navLinks).find(a => new URL(a.href, window.location.origin).pathname === '/');
    }

    if (best) {
        best.setAttribute('aria-current', 'page');
        best.classList.add('is-active');
    }
}


/**
 * Inject header and footer partials into #site-header / #site-footer.
 * Returns the header element (useful to init UI after injection).
 */
export async function injectPartials({
    headerSel = "#site-header",
    footerSel = "#site-footer",
    headerURL = "pages/partials/header.html",
    footerURL = "pages/partials/footer.html",
} = {}) {
    // 1) Load partials in parallel
    const [headerHTML, footerHTML] = await Promise.all([
        fetchPartial(headerURL),
        fetchPartial(footerURL),
    ]);

    // 2) Inject into DOM
    const headerMount = document.querySelector(headerSel);
    const footerMount = document.querySelector(footerSel);
    if (headerMount) headerMount.outerHTML = headerHTML; // replace to keep structure
    if (footerMount) footerMount.outerHTML = footerHTML;

    // 3) After injection, select the new header root
    const headerRoot = document.querySelector("header#site-header");
    if (headerRoot) setActiveNavLink(headerRoot);

    return headerRoot;
}
