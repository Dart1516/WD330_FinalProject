// js/features/heroes-details.js
// All comments in English.

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
        // Load all heroes
        const heroes = await getAllHeroes(DataConfig.LocalFirst);

        // Get slug from URL (?slug=abathur)
        const slug = getParam('slug');
        if (!slug) {
            console.error('Missing ?slug parameter');
            return;
        }

        // Find hero by slug, short_name, or id
        const hero = heroes.find(
            (h) =>
                h.slug === slug ||
                h.short_name === slug ||
                String(h.id) === slug
        );

        if (!hero) {
            console.error('Hero not found for slug:', slug);
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
   3) RENDER FUNCTIONS
   ========================================================= */
function renderHero(hero) {
    // ---------- Banner ----------
    const banner = hero.images?.banner;
    const portrait = hero.images?.portrait;

    // Reset sources
    $.video.innerHTML = '';
    $.video.removeAttribute('src');

    if (banner && banner.endsWith('.webm')) {
        // Use video banner
        const source = document.createElement('source');
        source.src = banner;
        source.type = 'video/webm';
        $.video.appendChild(source);
        $.video.style.display = 'block';
        $.img.style.display = 'none';
        $.video.load();
    } else {
        // Fallback to static image
        $.img.src = banner || portrait || '';
        $.img.alt = `Imagen de ${hero.name}`;
        $.img.style.display = 'block';
        $.video.style.display = 'none';
    }

    // ---------- Header data ----------
    $.name.textContent = hero.name || 'Nombre no disponible';
    $.sub.textContent = hero.tagline || ''; // optional
    $.role.textContent = hero.role || '';
    $.universe.textContent = hero.universe || '';
    $.rarity.textContent = hero.rarity || '';

    // ---------- Release ----------
    const release = hero.release_date || hero.releaseDate;
    if (release) {
        $.release.textContent = `Fecha de lanzamiento: ${release.slice(0, 10)}`;
    }

    // ---------- Prices ----------
    if (hero.prices) {
        $.prices.innerHTML = `
      ${hero.prices.gold ? `<span>🪙 ${hero.prices.gold}</span>` : ''}
      ${hero.prices.gems ? `<span>💎 ${hero.prices.gems}</span>` : ''}
    `;
    }

    // ---------- Description ----------
    $.desc.textContent = 'Cargando descripción…';
    getHeroDescription(hero).then((text) => {
        $.desc.textContent = text || 'Descripción no disponible por ahora.';
    });
}

/* =========================================================
   4) UTILS
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
