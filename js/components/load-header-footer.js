import { fetchPartial } from '../utils/partials-fetch.js';
import { fixInternalLinks, fixAssetPaths } from './link-asset-fixer.js';
import { setActiveNavLink } from '../effects/hover-current-nav-menu.js';

// add header and footer plus fix the url inconsistencies + highlight
export async function injectHeaderFooter({
    headerSel = '#site-header',
    footerSel = '#site-footer',
    headerURL = '/pages/partials/header.html',
    footerURL = '/pages/partials/footer.html',
    onHeaderReady = null,
} = {}) {
    const [headerHTML, footerHTML] = await Promise.all([
        fetchPartial(headerURL),
        fetchPartial(footerURL),
    ]);

    const headerMount = document.querySelector(headerSel);
    const footerMount = document.querySelector(footerSel);
    if (headerMount) headerMount.outerHTML = headerHTML;
    if (footerMount) footerMount.outerHTML = footerHTML;

    // -------------------------------
    // ✅ Header fixes
    // -------------------------------
    const headerRoot = document.querySelector('header#site-header');
    if (headerRoot) {
        fixInternalLinks(headerRoot);
        fixAssetPaths(headerRoot);
        setActiveNavLink(headerRoot);
        if (typeof onHeaderReady === 'function') onHeaderReady(headerRoot);
    }

    // -------------------------------
    // ✅ Footer fixes (añade esto)
    // -------------------------------
    const footerRoot = document.querySelector('footer#site-footer');
    if (footerRoot) {
        fixInternalLinks(footerRoot);
        fixAssetPaths(footerRoot);
    }

    return { headerRoot, footerRoot };
}
