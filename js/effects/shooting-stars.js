const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

/** Factory that manages spawn/update/draw for meteors. */
export function createShootingStarsSystem(getSize, dpr) {
    const meteors = [];

    // Config (do not change values)
    const cfg = {
        spawnsPerSecond: 0.15,
        speedMin: 520 * dpr,
        speedMax: 980 * dpr,
        trailLengthMin: 0, // set by diagonal on resize
        trailLengthMax: 0,
        widthMin: 1.1 * dpr,
        widthMax: 3.2 * dpr,
        lifeMinMs: 700,
        lifeMaxMs: 2600,
        exitInnerMargin: 36 * dpr,
        spawnPad: 28 * dpr,
        headFadeOutMs: 220
    };

    /** Called on resize to sync trail length with diagonal. */
    function onResize() {
        const { width, height } = getSize();
        const diag = Math.hypot(width, height);
        cfg.trailLengthMin = 0.16 * diag;
        cfg.trailLengthMax = 0.30 * diag;
    }

    function pointOnSide(side, pad, w, h) {
        switch (side) {
            case 0: return { x: -pad, y: Math.random() * h };        // left
            case 1: return { x: Math.random() * w, y: -pad };        // top
            case 2: return { x: w + pad, y: Math.random() * h };    // right
            case 3: return { x: Math.random() * w, y: h + pad };    // bottom
        }
    }

    function pickSpawnExit(w, h) {
        const entry = Math.floor(Math.random() * 4);
        const farExits = { 0: [2, 3], 1: [2, 3], 2: [0, 3], 3: [0, 2] };
        const exit = farExits[entry][Math.floor(Math.random() * 2)];
        const spawn = pointOnSide(entry, cfg.spawnPad, w, h);
        const m = cfg.exitInnerMargin;
        const raw = pointOnSide(exit, m, w, h);
        return { spawn, exit: { x: clamp(raw.x, m, w - m), y: clamp(raw.y, m, h - m) } };
    }

    function spawn() {
        const { width: w, height: h } = getSize();
        const { spawn, exit } = pickSpawnExit(w, h);

        const dx = exit.x - spawn.x, dy = exit.y - spawn.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;

        const speed = rand(cfg.speedMin, cfg.speedMax);
        const width = rand(cfg.widthMin, cfg.widthMax);
        const travel = Math.max(dist - cfg.exitInnerMargin, 100);
        let lifeMs = (travel / speed) * 1000;
        lifeMs = clamp(lifeMs, cfg.lifeMinMs, cfg.lifeMaxMs);
        const trail = rand(cfg.trailLengthMin, cfg.trailLengthMax);

        meteors.push({
            x: spawn.x, y: spawn.y,
            vx: ux * speed, vy: uy * speed,
            width, trailLength: trail,
            lifeMs, bornAt: performance.now()
        });
    }

    function maybeSpawn(dt) {
        if (Math.random() < cfg.spawnsPerSecond * dt) spawn();
    }

    function update(dt, now) {
        for (const m of meteors) { m.x += m.vx * dt; m.y += m.vy * dt; }
        const { width: w, height: h } = getSize();
        const pad = 80 * dpr;
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            const age = now - m.bornAt;
            const off = m.x < -pad || m.x > w + pad || m.y < -pad || m.y > h + pad;
            if (age > m.lifeMs || off) meteors.splice(i, 1);
        }
    }

    function draw(ctx, now) {
        for (const m of meteors) {
            const v = Math.hypot(m.vx, m.vy) || 1;
            const ux = m.vx / v, uy = m.vy / v;
            const hx = m.x, hy = m.y;
            const tx = hx - ux * m.trailLength;
            const ty = hy - uy * m.trailLength;

            const age = now - m.bornAt;
            const t = Math.min(age / m.lifeMs, 1);
            let alpha = 1 - t * 0.85;
            if (m.lifeMs - age < 220) alpha *= Math.max((m.lifeMs - age) / 220, 0);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // trail
            const trail = ctx.createLinearGradient(hx, hy, tx, ty);
            trail.addColorStop(0.00, `rgba(255,255,255,${0.98 * alpha})`);
            trail.addColorStop(0.12, `rgba(220,220,255,${0.65 * alpha})`);
            trail.addColorStop(0.40, `rgba(170,150,255,${0.34 * alpha})`);
            trail.addColorStop(1.00, `rgba(130,100,240,0.00)`);
            ctx.strokeStyle = trail;
            ctx.lineWidth = m.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            // head glow
            const r = Math.max(m.width * 1.9, 2.2 * dpr);
            const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 2.4);
            g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
            g.addColorStop(0.5, `rgba(230,215,255,${0.55 * alpha})`);
            g.addColorStop(1, `rgba(160,120,255,0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(hx, hy, r * 2.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    return { onResize, maybeSpawn, update, draw };
}
