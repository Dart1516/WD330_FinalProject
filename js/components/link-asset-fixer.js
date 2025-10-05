import { REPO_BASE, fromRoot } from '../utils/local-and-github-pathing.js';

// prefixt to interlanl href only  worj with github 
export function fixInternalLinks(root) {
    if (!root || !REPO_BASE) return;
    root.querySelectorAll('a[href^="/"]:not([target="_blank"])').forEach(a => {
        const raw = a.getAttribute('href');
        if (raw && !raw.startsWith(REPO_BASE + '/')) a.setAttribute('href', fromRoot(raw));
    });
}

// prefixt of normal routes to assets (img/src, srcset, svg/use href)
export function fixAssetPaths(root) {
    if (!root || !REPO_BASE) return;

    const prefix = v => (v && v.startsWith('/') && !v.startsWith(REPO_BASE + '/')) ? fromRoot(v) : v;

    root.querySelectorAll('img[src]').forEach(img => {
        const raw = img.getAttribute('src'); const next = prefix(raw);
        if (next !== raw) img.setAttribute('src', next);
    });

    root.querySelectorAll('img[srcset], source[srcset]').forEach(el => {
        const raw = el.getAttribute('srcset'); if (!raw) return;
        const fixed = raw.split(',').map(part => {
            const [url, size] = part.trim().split(/\s+/, 2);
            const newUrl = prefix(url);
            return size ? `${newUrl} ${size}` : newUrl;
        }).join(', ');
        if (fixed !== raw) el.setAttribute('srcset', fixed);
    });

    root.querySelectorAll('use[href], use[xlink\\:href]').forEach(use => {
        const cur = use.getAttribute('href') || use.getAttribute('xlink:href');
        const next = prefix(cur);
        if (next !== cur) {
            if (use.hasAttribute('href')) use.setAttribute('href', next);
            if (use.hasAttribute('xlink:href')) use.setAttribute('xlink:href', next);
        }
    });
}
