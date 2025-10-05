import { buildStaticStars, drawStaticStars } from './static-stars.js';
import { createShootingStarsSystem } from './shooting-stars.js';


/** Public API */
export function initStarsBackground(canvasSelector = '#stars') {
    // DOM
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) return; // safety
    const ctx = canvas.getContext('2d', { alpha: true });

    // DPR capped (perf)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Size helpers
    let W = 0, H = 0;
    const getSize = () => ({ width: W, height: H });
              
    // Systems
    let stars = [];
    const shooting = createShootingStarsSystem(getSize, dpr);

    /** Resize canvas + rebuild stars + notify shooting system. */
    function resizeAll() {
        W = canvas.width = Math.floor(innerWidth * dpr);
        H = canvas.height = Math.floor(innerHeight * dpr);
        canvas.style.width = innerWidth + 'px';
        canvas.style.height = innerHeight + 'px';

        stars = buildStaticStars(W, H, dpr);
        shooting.onResize();
    }

    // Loop
    let last = performance.now();
    function frame(now) {
        const dtMs = Math.min(now - last, 50);
        last = now;
        const dt = dtMs / 1000;

        ctx.clearRect(0, 0, W, H);

        // layer 1: static stars
        drawStaticStars(ctx, stars, W);

        // layer 2: shooting stars
        shooting.maybeSpawn(dt);
        shooting.update(dt, now);
        shooting.draw(ctx, now);

        requestAnimationFrame(frame);
    }

    // Wire up
    window.addEventListener('resize', resizeAll, { passive: true });
    resizeAll();
    requestAnimationFrame(frame);
}
