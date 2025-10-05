// js/main.js
import { initStarsBackground } from './effects/stars-background.js';
import { initHamburgerMenu } from './components/hamburger-menu.js';
import { injectHeaderFooter } from './components/load-header-footer.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerEl = await injectHeaderFooter().catch(err => { console.error(err); return null; });

    if (headerEl) {
        window.__hamburger = initHamburgerMenu({
            headerSel: '#site-header',
            toggleSel: '.menu-toggle',
            navSel: '#main-nav',
            desktopMQ: '(min-width: 901px)',
        });
    }

    initStarsBackground('#stars');
});
