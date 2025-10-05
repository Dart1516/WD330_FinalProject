// js/components/load-header-footer.js
// Load header/footer partials with GitHub Pages support.
// - Works on localhost and on <user>.github.io/<repo>
// - Fixes internal links and asset paths inside the injected header
// - Highlights the current nav item

/* ------------------------------ REPO BASE PATH ----------------------------- */

const REPO_BASE = location.hostname.endsWith('github.io')
    ? `/${location.pathname.split('/')[1] || ''}`  // e.g. "/WD330_FinalProject"
    : '';                                          // local: empty

/* ------------------------------- PATH HELPERS ------------------------------ */

// Normalize to root path ("/foo/bar"), removing duplicated "/<repo>" if present
function toRootPath(path) {
    if (!path) return '/';
    const p = path.startsWith('/') ? path : `/${path}`;
    return (REPO_BASE && p.startsWith(REPO_BASE + '/')) ? p.slice(REPO_BASE.length) : p;
}

// Build a URL that works both locally and on GitHub Pages
function fromRoot(path) {
    return `${REPO_BASE}${toRootPath(path)}`;
}

// Key to compare pages by filename ("index.html", "cuenta.html", etc.)
function pathKey(pathname) {
    let p = pathname || '/';
    if (REPO_BASE && p.startsWith(REPO_BASE)) p = p.slice(REPO_BASE.length) || '/';
    if (p === '/' || p === '') return 'index.html';
    const clean = p.replace(/\/+$/, '');
    const last = clean.split('/').pop();
    return last ? last.toLowerCase() : 'index.html';
}

/* ------------------------------- FETCH HELPERS ----------------------------- */

// Fetch a partial and return HTML text (throws on non-OK)
async function fetchPartial(rootPath) {
    const url = fromRoot(rootPath);
    const res = await fetch(url, { cache: 'no-cache' }); // dev-friendly
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.text();
}

/* -------------------------------- DOM HELPERS ------------------------------ */

// Prefix internal links with REPO_BASE on GitHub Pages
function fixInternalLinks(root) {
    if (!root || !REPO_BASE) return;
    const anchors = root.querySelectorAll('a[href^="/"]:not([target="_blank"])');
    anchors.forEach(a => {
        const raw = a.getAttribute('href');
        if (raw && !raw.startsWith(REPO_BASE + '/')) {
            a.setAttribute('href', fromRoot(raw));
        }
    });
}

// Prefix root-relative asset paths (img/src, srcset, svg/use href)
function fixAssetPaths(root) {
    if (!root || !REPO_BASE) return;

    const prefix = (val) =>
        (val && val.startsWith('/') && !val.startsWith(REPO_BASE + '/')) ? fromRoot(val) : val;

    // <img src>
    root.querySelectorAll('img[src]').forEach(img => {
        const raw = img.getAttribute('src');
        const next = prefix(raw);
        if (next !== raw) img.setAttribute('src', next);
    });

    // <img srcset> and <source srcset>
    root.querySelectorAll('img[srcset], source[srcset]').forEach(el => {
        const raw = el.getAttribute('srcset');
        if (!raw) return;
        const fixed = raw.split(',').map(part => {
            const [url, size] = part.trim().split(/\s+/, 2);
            const newUrl = prefix(url);
            return size ? `${newUrl} ${size}` : newUrl;
        }).join(', ');
        if (fixed !== raw) el.setAttribute('srcset', fixed);
    });

    // SVG: <use href="..."> and legacy xlink:href
    root.querySelectorAll('use[href], use[xlink\\:href]').forEach(use => {
        const cur = use.getAttribute('href') || use.getAttribute('xlink:href');
        const next = prefix(cur);
        if (next !== cur) {
            if (use.hasAttribute('href')) use.setAttribute('href', next);
            if (use.hasAttribute('xlink:href')) use.setAttribute('xlink:href', next);
        }
    });
}

// Highlight current page in the header (adds aria-current + .is-active)
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

    // Compare by filename
    const matchesCurrent = el => {
        const href = el.getAttribute('href');
        const hrefPath = new URL(href, window.location.origin).pathname;
        return pathKey(hrefPath) === currentKey;
    };

    let best = Array.from(navLinks).find(matchesCurrent)
        || Array.from(actionLinks).find(matchesCurrent);

    // Fallback for home ("/")
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

/* --------------------------------- PUBLIC API ------------------------------ */

export async function injectPartials({
    headerSel = '#site-header',
    footerSel = '#site-footer',
    // Use root-relative paths here (with or without leading "/")
    headerURL = '/pages/partials/header.html',
    footerURL = '/pages/partials/footer.html',
    onHeaderReady = null,  // optional callback after header is injected
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

    // 3) After injection: normalize links/assets and set active state
    const headerRoot = document.querySelector('header#site-header');
    fixInternalLinks(headerRoot);
    fixAssetPaths(headerRoot);
    setActiveNavLink(headerRoot);

    if (typeof onHeaderReady === 'function') onHeaderReady(headerRoot);
    return headerRoot;
}

// (Optional) export internals for testing or reuse
export const __internal = {
    REPO_BASE, toRootPath, fromRoot, pathKey,
    fetchPartial, fixInternalLinks, fixAssetPaths, setActiveNavLink,
};
