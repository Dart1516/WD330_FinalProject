
/* ------------------------------ REPO BASE PATH ----------------------------- */

// If we are on GitHub Pages, prefix paths with "/<repo>"
const REPO_BASE = location.hostname.endsWith('github.io')
    ? `/${location.pathname.split('/')[1] || ''}`  // e.g. "/WD330_FinalProject"
    : '';                                          // local: empty

/* ------------------------------- PATH HELPERS ------------------------------ */

// Ensure a root path like "/foo/bar". Strip repo base if already present.
function toRootPath(path) {
    if (!path) return '/';
    const p = path.startsWith('/') ? path : `/${path}`;
    return (REPO_BASE && p.startsWith(REPO_BASE + '/')) ? p.slice(REPO_BASE.length) : p;
}

// Build a URL that works both locally and on GitHub Pages
function fromRoot(path) {
    return `${REPO_BASE}${toRootPath(path)}`;
}

// Normalize a pathname for comparing pages (ignore repo folder)
function pathKey(pathname) {
    let p = pathname || '/';
    if (REPO_BASE && p.startsWith(REPO_BASE)) p = p.slice(REPO_BASE.length) || '/';
    if (p === '/' || p === '') return 'index.html';
    const clean = p.replace(/\/+$/, '');
    const last = clean.split('/').pop();
    return last ? last.toLowerCase() : 'index.html';
}

/* ------------------------------- FETCH HELPERS ---------------------------- */

// Fetch a partial and return its HTML (throws on non-OK)
async function fetchPartial(rootPath) {
    const url = fromRoot(rootPath);
    const res = await fetch(url, { cache: 'no-cache' }); // dev-friendly
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.text();
}

/* -------------------------------- DOM HELPERS ----------------------------- */

// Prefix internal links with REPO_BASE on GitHub Pages (avoid broken nav)
function fixInternalLinks(root) {
    if (!root) return;
    const anchors = root.querySelectorAll('a[href^="/"]');
    anchors.forEach(a => {
        const raw = a.getAttribute('href');                // original string
        const needsPrefix = !(REPO_BASE && raw.startsWith(REPO_BASE + '/'));
        if (needsPrefix) a.setAttribute('href', fromRoot(raw));
    });
}

// Mark current page in the header (adds aria-current + .is-active)
function setActiveNavLink(headerRoot) {
    if (!headerRoot) return;

    const currentKey = pathKey(window.location.pathname);

    const navLinks = headerRoot.querySelectorAll('#main-nav a[href]');
    const actionLinks = headerRoot.querySelectorAll('.header-actions a[href]');
    const all = [...navLinks, ...actionLinks];

    // Reset state
    all.forEach(a => {
        a.removeAttribute('aria-current');
        a.classList.remove('is-active');
    });

    // Match by filename (index.html, heroes.html, etc.)
    const matchesCurrent = el => {
        const href = el.getAttribute('href');
        const hrefPath = new URL(href, window.location.origin).pathname;
        return pathKey(hrefPath) === currentKey;
    };

    let best = Array.from(navLinks).find(matchesCurrent)
        || Array.from(actionLinks).find(matchesCurrent);

    // Extra fallback for home ("/")
    if (!best && currentKey === 'index.html') {
        best = Array.from(navLinks).find(a => {
            const p = new URL(a.getAttribute('href'), window.location.origin).pathname;
            return pathKey(p) === 'index.html';
        });
    }

    if (best) {
        best.setAttribute('aria-current', 'page');
        best.classList.add('is-active');
    }
}

/* --------------------------------- PUBLIC API ----------------------------- */

export async function injectPartials({
    headerSel = '#site-header',
    footerSel = '#site-footer',
    // Always pass root-relative paths here (with or without leading "/")
    headerURL = '/pages/partials/header.html',
    footerURL = '/pages/partials/footer.html',
} = {}) {
    // 1) Load both partials in parallel
    const [headerHTML, footerHTML] = await Promise.all([
        fetchPartial(headerURL),
        fetchPartial(footerURL),
    ]);

    // 2) Replace mount points with fetched HTML
    const headerMount = document.querySelector(headerSel);
    const footerMount = document.querySelector(footerSel);
    if (headerMount) headerMount.outerHTML = headerHTML;
    if (footerMount) footerMount.outerHTML = footerHTML;

    // 3) After injection: normalize links and set active state
    const headerRoot = document.querySelector('header#site-header');
    fixInternalLinks(headerRoot);
    setActiveNavLink(headerRoot);

    return headerRoot;
}
