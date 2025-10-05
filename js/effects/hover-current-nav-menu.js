import { pathKey } from '../utils/local-and-github-pathing.js';

//  hover aor underscore the actuale link on the menu 
export function setActiveNavLink(headerRoot) {
    if (!headerRoot) return;

    const currentKey = pathKey(window.location.pathname);
    const navLinks = headerRoot.querySelectorAll('#main-nav a[href]');
    const actionLinks = headerRoot.querySelectorAll('.header-actions a[href]');
    const all = [...navLinks, ...actionLinks];

    all.forEach(a => { a.removeAttribute('aria-current'); a.classList.remove('is-active'); });

    const matches = el => {
        const href = el.getAttribute('href');
        const path = new URL(href, window.location.origin).pathname;
        return pathKey(path) === currentKey;
    };

    let best = Array.from(navLinks).find(matches) || Array.from(actionLinks).find(matches);

    if (!best && currentKey === 'index.html') {
        best = Array.from(navLinks).find(a => {
            const p = new URL(a.getAttribute('href'), window.location.origin).pathname;
            return pathKey(p) === 'index.html';
        });
    }

    if (best) { best.setAttribute('aria-current', 'page'); best.classList.add('is-active'); }
}
