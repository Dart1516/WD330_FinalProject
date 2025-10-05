const TWO_PI = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

/** Build stars array  */
export function buildStaticStars(width, height, dpr) {
    const STAR_COUNT = innerWidth < 600 ? 120 : 220; // do not change
    return Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: rand(0.6, 1.8) * dpr,
        twinklePhase: Math.random() * TWO_PI,
        twinkleSpeed: rand(0.006, 0.018),
        driftX: rand(0.02, 0.06)
    }));
}

/** Draw + update all static stars. */
export function drawStaticStars(ctx, stars, canvasWidth) {
    for (const s of stars) {
        // twinkle
        s.twinklePhase += s.twinkleSpeed;
        const a = 0.5 + 0.5 * Math.sin(s.twinklePhase); // 0..1

        // soft glow
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2.5);
        g.addColorStop(0, `rgba(255,255,255,${0.85 * a})`);
        g.addColorStop(0.6, `rgba(180,160,255,${0.6 * a})`);
        g.addColorStop(1, `rgba(120,80,220,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 2.5, 0, TWO_PI);
        ctx.fill();

        // tiny horizontal drift
        s.x += s.driftX;
        if (s.x > canvasWidth + 5) s.x = -5;
    }
}
