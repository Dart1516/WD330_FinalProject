// Runs when the DOM is ready (extra safety in case you forget "defer")
document.addEventListener('DOMContentLoaded', () => {
    const starCanvas = document.getElementById('stars');
    const ctx = starCanvas.getContext('2d', { alpha: true });

    // Canvas metrics and device pixel ratio (capped for performance)
    let canvasWidth, canvasHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Array of static background stars (twinkling)
    let staticStars = [];

    /** Random helper: returns a float in [a, b) */
    function randomBetween(a, b) { return a + Math.random() * (b - a); }

    /**
     * Resize canvas to full viewport (retina-aware) and rebuild static stars.
     * NOTE: This does NOT change the star COUNT formula, preserving your scene density.
     */
    function resizeCanvasAndRebuildStars() {
        canvasWidth = starCanvas.width = Math.floor(innerWidth * dpr);
        canvasHeight = starCanvas.height = Math.floor(innerHeight * dpr);
        starCanvas.style.width = innerWidth + 'px';
        starCanvas.style.height = innerHeight + 'px';

        // Static stars (DO NOT CHANGE COUNT or twinkle logic)
        const STAR_COUNT = innerWidth < 600 ? 120 : 220; // keep identical density
        staticStars = Array.from({ length: STAR_COUNT }, () => ({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            radius: randomBetween(0.6, 1.8) * dpr,     // visual radius
            twinklePhase: Math.random() * Math.PI * 2, // starting phase for twinkle
            twinkleSpeed: randomBetween(0.006, 0.018), // twinkle speed (adjust to change twinkle rate)
            driftSpeedX: randomBetween(0.02, 0.06)    // subtle horizontal parallax drift
        }));

        // Update shooting-star trail lengths to match current canvas diagonal
        const diagonal = Math.hypot(canvasWidth, canvasHeight);
        shootingConfig.trailLengthMin = 0.16 * diagonal; // ~16% of diagonal
        shootingConfig.trailLengthMax = 0.30 * diagonal; // ~30% of diagonal
    }

    /**
     * Draw a single static star with a soft radial glow and twinkle.
     * Twinkle is controlled by `twinklePhase` and `twinkleSpeed`.
     */
    function drawStaticStar(s) {
        // Twinkle update
        s.twinklePhase += s.twinkleSpeed;
        const twinkleOpacity = 0.5 + 0.5 * Math.sin(s.twinklePhase); // range 0..1

        // Soft radial gradient for a dreamy glow
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2.5);
        glow.addColorStop(0, `rgba(255,255,255,${0.85 * twinkleOpacity})`);
        glow.addColorStop(0.6, `rgba(180,160,255,${0.6 * twinkleOpacity})`);
        glow.addColorStop(1, `rgba(120,80,220,0)`);

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Very subtle horizontal parallax drift
        s.x += s.driftSpeedX;
        if (s.x > canvasWidth + 5) s.x = -5;
    }

    // ⭐ SHOOTING STARS (meteors): separate system (does NOT affect static stars)
    const shootingStars = [];

    /**
     * Configuration for shooting stars.
     * Tweak here to control frequency, speed, width, life, margins, etc.
     */
    const shootingConfig = {
        /** Frequency: average spawns per second (lower = rarer, higher = more often) */
        spawnsPerSecond: 0.65, // e.g., ~1 every ~1.5s on average

        /** Speed in pixels/second (increase for faster streaks) */
        speedMin: 520 * dpr,
        speedMax: 980 * dpr,

        /** Trail length (set precisely after resize using canvas diagonal) */
        trailLengthMin: 0,
        trailLengthMax: 0,

        /** Line width of the streak (increase for chunkier meteors) */
        widthMin: 1.1 * dpr,
        widthMax: 3.2 * dpr,

        /** Visible life bounds in milliseconds (actual life auto-computed per path) */
        lifeMinMs: 700,
        lifeMaxMs: 2600,

        /** Keep head slightly inside before exiting (avoid abrupt clipping) */
        exitInnerMargin: 36 * dpr,

        /** Start just beyond the canvas edge for a natural entry */
        spawnPad: 28 * dpr
    };

    /**
     * Pick random entry and exit edges so the meteor crosses the screen.
     * Sides: 0=left, 1=top, 2=right, 3=bottom.
     */
    function pickSpawnAndExitSides() {
        const entrySide = Math.floor(Math.random() * 4);

        // Prefer far exit sides to ensure long crossings
        const farExits = { 0: [2, 3], 1: [2, 3], 2: [0, 3], 3: [0, 2] };
        const exitCandidates = farExits[entrySide];
        const exitSide = exitCandidates[Math.floor(Math.random() * exitCandidates.length)];

        function pointOnSide(side, pad) {
            switch (side) {
                case 0: return { x: -pad, y: Math.random() * canvasHeight }; // left
                case 2: return { x: canvasWidth + pad, y: Math.random() * canvasHeight }; // right
                case 1: return { x: Math.random() * canvasWidth, y: -pad };             // top
                case 3: return { x: Math.random() * canvasWidth, y: canvasHeight + pad }; // bottom
            }
        }

        const spawnPoint = pointOnSide(entrySide, shootingConfig.spawnPad);

        // Exit point pulled slightly inward to fade before leaving the screen
        let exitPoint = pointOnSide(exitSide, shootingConfig.exitInnerMargin);
        exitPoint.x = Math.min(Math.max(exitPoint.x, shootingConfig.exitInnerMargin),
            canvasWidth - shootingConfig.exitInnerMargin);
        exitPoint.y = Math.min(Math.max(exitPoint.y, shootingConfig.exitInnerMargin),
            canvasHeight - shootingConfig.exitInnerMargin);

        return { spawnPoint, exitPoint };
    }

    /**
     * Spawn a single shooting star.
     * It will traverse toward the chosen exit and fade shortly before reaching it.
     */
    function spawnShootingStar() {
        const { spawnPoint, exitPoint } = pickSpawnAndExitSides();

        const dx = exitPoint.x - spawnPoint.x;
        const dy = exitPoint.y - spawnPoint.y;
        const distance = Math.hypot(dx, dy) || 1;

        // Normalized direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Kinematics and visuals
        const speed = randomBetween(shootingConfig.speedMin, shootingConfig.speedMax); // px/s
        const lineWidth = randomBetween(shootingConfig.widthMin, shootingConfig.widthMax);

        // Life tuned so it fades just before reaching the exit (no hard cut at edge)
        const distanceToTravel = Math.max(distance - shootingConfig.exitInnerMargin, 100);
        let lifeMs = (distanceToTravel / speed) * 1000; // ms
        lifeMs = Math.max(shootingConfig.lifeMinMs, Math.min(lifeMs, shootingConfig.lifeMaxMs));

        const trailLength = randomBetween(shootingConfig.trailLengthMin, shootingConfig.trailLengthMax);

        shootingStars.push({
            x: spawnPoint.x,
            y: spawnPoint.y,
            velX: dirX * speed,
            velY: dirY * speed,
            trailLength,
            lineWidth,
            lifeMs,
            bornAtMs: performance.now(),
            fadeOutMs: 220 // how quickly it fades at the end
        });
    }

    /**
     * Draw a single shooting star with a bright head and a soft trail.
     * Increase gradient stops/alphas to make the streak more pronounced.
     */
    function drawShootingStar(m, nowMs) {
        const headX = m.x, headY = m.y;

        const vLen = Math.hypot(m.velX, m.velY) || 1;
        const ux = m.velX / vLen, uy = m.velY / vLen;

        // Trail goes "behind" the head, opposite to motion direction
        const tailX = headX - ux * m.trailLength;
        const tailY = headY - uy * m.trailLength;

        const ageMs = nowMs - m.bornAtMs;
        const t = Math.min(ageMs / m.lifeMs, 1);

        // Base opacity with a stronger presence and quick end fade
        let alpha = 1 - t * 0.85;
        if (m.lifeMs - ageMs < m.fadeOutMs) {
            const k = Math.max((m.lifeMs - ageMs) / m.fadeOutMs, 0);
            alpha *= k;
        }

        // Luminous trail
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const trail = ctx.createLinearGradient(headX, headY, tailX, tailY);
        trail.addColorStop(0.00, `rgba(255,255,255,${0.98 * alpha})`); // bright head
        trail.addColorStop(0.12, `rgba(220,220,255,${0.65 * alpha})`);
        trail.addColorStop(0.40, `rgba(170,150,255,${0.34 * alpha})`);
        trail.addColorStop(1.00, `rgba(130,100,240,0.00)`);           // dissipates

        ctx.strokeStyle = trail;
        ctx.lineWidth = m.lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Glow around the head
        const headRadius = Math.max(m.lineWidth * 1.9, 2.2 * dpr);
        const headGlow = ctx.createRadialGradient(headX, headY, 0, headX, headY, headRadius * 2.4);
        headGlow.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
        headGlow.addColorStop(0.5, `rgba(230,215,255,${0.55 * alpha})`);
        headGlow.addColorStop(1, `rgba(160,120,255,0)`);
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Update all shooting stars:
     * - Move by velocity * dt
     * - Remove those that finished life or are far off-screen
     */
    function updateShootingStars(deltaSeconds, nowMs) {
        for (const m of shootingStars) {
            m.x += m.velX * deltaSeconds;
            m.y += m.velY * deltaSeconds;
        }
        const offscreenPad = 80 * dpr;
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const m = shootingStars[i];
            const ageMs = nowMs - m.bornAtMs;
            const off =
                (m.x < -offscreenPad || m.x > canvasWidth + offscreenPad ||
                    m.y < -offscreenPad || m.y > canvasHeight + offscreenPad);
            if (ageMs > m.lifeMs || off) shootingStars.splice(i, 1);
        }
    }

    /**
     * Maybe spawn a shooting star based on elapsed time.
     * This is FPS-independent: the probability uses real time (dt).
     *
     * 🔧 Adjust to change shooting-star frequency:
     *    - Increase `spawnsPerSecond` for more
     *    - Decrease for fewer
     */
    function maybeSpawnShootingStar(deltaSeconds) {
        const probabilityThisFrame = shootingConfig.spawnsPerSecond * deltaSeconds;
        if (Math.random() < probabilityThisFrame) spawnShootingStar();
    }

    // Animation loop using high-resolution timestamps for smooth motion
    let lastFrameTimeMs = performance.now();
    function animationLoop(nowMs) {
        const dtMs = Math.min(nowMs - lastFrameTimeMs, 50); // cap to avoid large jumps
        lastFrameTimeMs = nowMs;
        const dt = dtMs / 1000; // seconds

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw static stars (twinkle preserved exactly)
        for (const s of staticStars) drawStaticStar(s);

        // Spawn/update/draw shooting stars (independent layer)
        maybeSpawnShootingStar(dt);
        updateShootingStars(dt, nowMs);
        for (const m of shootingStars) drawShootingStar(m, nowMs);

        requestAnimationFrame(animationLoop);
    }

    // Handle window resizes
    window.addEventListener('resize', resizeCanvasAndRebuildStars, { passive: true });

    // Initial setup and go!
    resizeCanvasAndRebuildStars();

    // (Optional) Uncomment this to force an immediate shooting star for testing:
    // spawnShootingStar();

    requestAnimationFrame(animationLoop);
});
