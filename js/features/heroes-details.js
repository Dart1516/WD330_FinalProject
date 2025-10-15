import { getAllHeroes, DataConfig } from './heroes-data.js';
import { getHeroDescription } from '../utils/wiki.js';

/* =========================================================
   1) DOM ELEMENTS
   ========================================================= */
const $ = {
    banner: document.getElementById('hero-banner'),
    video: document.getElementById('hero-video'),
    img: document.getElementById('hero-image-fallback'),
    name: document.getElementById('hero-name'),
    sub: document.getElementById('hero-sub'),
    role: document.getElementById('hero-role'),
    universe: document.getElementById('hero-universe'),
    rarity: document.getElementById('hero-rarity'),
    desc: document.getElementById('hero-desc-text'),
    release: document.getElementById('hero-release'),
    prices: document.getElementById('hero-prices'),
};

/* =========================================================
   2) INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const heroes = await getAllHeroes(DataConfig.LocalFirst);
        const slug = getParam('slug');
        if (!slug) return;

        const hero = heroes.find(
            (h) => h.slug === slug || h.short_name === slug || String(h.id) === slug
        );

        if (!hero) {
            showErrorState();
            return;
        }

        renderHero(hero);
    } catch (err) {
        console.error('Error loading hero details:', err);
        showErrorState();
    }
}

/* =========================================================
   3) HELPERS
   ========================================================= */
function resolveAsset(p) {
    if (!p) return '';
    if (/^https?:\/\//.test(p)) return p;
    const repo = location.hostname.endsWith('github.io')
        ? location.pathname.split('/')[1]
        : '';
    const base = repo ? `/${repo}/` : '/';
    return p.startsWith('/') ? base + p.slice(1) : base + p;
}

/* =========================================================
   4) RENDER FUNCTIONS
   ========================================================= */
function renderHero(hero) {
    const bannerUrl = resolveAsset(hero.images?.banner);
    const portraitUrl = resolveAsset(hero.images?.portrait);

    $.video.innerHTML = '';
    $.video.removeAttribute('src');

    if (bannerUrl && bannerUrl.endsWith('.webm')) {
        const source = document.createElement('source');
        source.src = bannerUrl;
        source.type = 'video/webm';
        $.video.appendChild(source);
        $.video.style.display = 'block';
        $.img.style.display = 'none';
        $.video.load();
    } else {
        $.img.src = bannerUrl || portraitUrl || '';
        $.img.alt = `Imagen de ${hero.name}`;
        $.img.style.display = 'block';
        $.video.style.display = 'none';
    }

    $.name.textContent = hero.name || 'Nombre no disponible';
    $.sub.textContent = hero.tagline || '';
    $.role.textContent = hero.role || '';
    $.universe.textContent = hero.universe || '';
    $.rarity.textContent = hero.rarity || '';

    const release = hero.release_date || hero.releaseDate;
    if (release) $.release.textContent = `Fecha de lanzamiento: ${release.slice(0, 10)}`;

    if (hero.prices) {
        $.prices.innerHTML = `
      ${hero.prices.gold ? `<span>🪙 ${hero.prices.gold}</span>` : ''}
      ${hero.prices.gems ? `<span>💎 ${hero.prices.gems}</span>` : ''}
    `;
    }

    $.desc.textContent = 'Cargando descripción…';
    getHeroDescription(hero).then((text) => {
        $.desc.textContent = text || 'Descripción no disponible por ahora.';
    });
}

/* =========================================================
   5) UTILS
   ========================================================= */
function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function showErrorState() {
    $.banner?.insertAdjacentHTML(
        'beforeend',
        `<p style="padding:2rem; color:#ccc; text-align:center;">No se encontró información del héroe.</p>`
    );
}
