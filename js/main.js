// js/main.js
import { initStarsBackground } from './effects/stars-background.js';
import { initHamburgerMenu } from './components/hamburger-menu.js';
import { injectPartials } from './components/load-header-footer.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1) Inject header/footer
    let headerEl = null;
    try {
        headerEl = await injectPartials();
    } catch (err) {
        console.error(err);
    }

    // 2) Init hamburger after header exists
    if (headerEl) {
        // Expose for debugging if you like
        window.__hamburger = initHamburgerMenu({
            headerSel: '#site-header',
            toggleSel: '.menu-toggle',
            navSel: '#main-nav',
            desktopMQ: '(min-width: 901px)',
        });
    }

    // 3) Stars background (independent)
    initStarsBackground('#stars');
});
