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
 * Normalize path for comparison (e.g., "/" == "/index.html").
 */
function normalizePath(pathname) {
    if (!pathname || pathname === "/") return "/index.html";
    // Remove trailing slash
    const clean = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    // Map "/pages" to "/pages/index.html" if needed (optional)
    return clean.toLowerCase();
}

/**
 * Set active nav link based on current location.
 */
function setActiveNavLink(headerRoot) {
    const current = normalizePath(window.location.pathname);
    const links = headerRoot.querySelectorAll('nav a[href^="/"]');

    // Clear previous states
    links.forEach(a => {
        a.removeAttribute("aria-current");
        a.classList.remove("is-active");
    });

    // Try exact match first
    let best = Array.from(links).find(a => normalizePath(new URL(a.href).pathname) === current);

    // Fallback: treat "/" as "/index.html"
    if (!best && current === "/index.html") {
        best = Array.from(links).find(a => new URL(a.href).pathname === "/");
    }

    if (best) {
        best.setAttribute("aria-current", "page");
        best.classList.add("is-active");
    }
}

/**
 * Inject header and footer partials into #site-header / #site-footer.
 * Returns the header element (useful to init UI after injection).
 */
export async function injectPartials({
    headerSel = "#site-header",
    footerSel = "#site-footer",
    headerURL = "/pages/partials/header.html",
    footerURL = "/pages/partials/footer.html",
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
