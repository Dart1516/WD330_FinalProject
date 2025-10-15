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
    badgeRole: document.getElementById('badge-role'),
    badgeUniverse: document.getElementById('badge-universe'),
    

};

const ROLE_CLASS_BY_TOKEN = {
    'Bruiser': 'role-warrior',
    'Healer': 'role-healer',
    'Melee Assassin': 'role-ass-melee',
    'Ranged Assassin': 'role-ass-range',
    'Support': 'role-support',
    'Tank': 'role-tank',
};
const UNI_CLASS_BY_TOKEN = {
    'Diablo': 'uni-diablo',
    'Nexus': 'uni-nexus',
    'Overwatch': 'uni-overwatch',
    'StarCraft': 'uni-starcraft',
    'Warcraft': 'uni-warcraft',
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

        await renderHero(hero);
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

function fileSafeName(s = '') {
    return String(s)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

async function fileExists(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        return res.ok;
    } catch {
        return false;
    }
}

async function pickBestBannerAsset(hero) {
    const baseDir = resolveAsset('/assets/img/heroes/');
    const names = Array.from(new Set([
        hero.slug,
        hero.short_name,
        hero.name && fileSafeName(hero.name),
    ].filter(Boolean)));
    const withB = names.flatMap(n => [n, `${n}-b`]);

    const localVideoCandidates = withB.map(n => `${baseDir}${n}.webm`);
    const localImageCandidates = withB.map(n => `${baseDir}${n}.webp`);

    for (const url of localVideoCandidates) {
        if (await fileExists(url)) return { type: 'video', url };
    }
    for (const url of localImageCandidates) {
        if (await fileExists(url)) return { type: 'image', url };
    }

    const bannerUrl = resolveAsset(hero.images?.banner);
    if (bannerUrl) {
        if (bannerUrl.endsWith('.webm')) return { type: 'video', url: bannerUrl };
        return { type: 'image', url: bannerUrl };
    }
    const portraitUrl = resolveAsset(hero.images?.portrait);
    if (portraitUrl) return { type: 'image', url: portraitUrl };

    return { type: 'none', url: '' };
}

/* =========================================================
   4) RENDER FUNCTIONS
   ========================================================= */
async function renderHero(hero) {
    const roleClass = ROLE_CLASS_BY_TOKEN[hero.new_role || hero.role] || 'role-ass-melee';
    const uniClass = UNI_CLASS_BY_TOKEN[hero.universe] || 'uni-nexus';

    $.badgeRole.className = `badge-icon ${roleClass}`;
    $.badgeRole.title = hero.new_role || hero.role || 'Rol';

    $.badgeUniverse.className = `badge-icon ${uniClass}`;
    $.badgeUniverse.title = hero.universe || 'Universo';

    const best = await pickBestBannerAsset(hero);

    $.video.innerHTML = '';
    $.video.removeAttribute('src');

    if (best.type === 'video') {
        const source = document.createElement('source');
        source.src = best.url;
        source.type = 'video/webm';
        source.onerror = async () => {
            const fallback = await pickBestBannerAsset({ ...hero, images: { banner: '', portrait: hero.images?.portrait } });
            if (fallback.type === 'image') {
                $.img.src = fallback.url;
                $.img.alt = `Imagen de ${hero.name}`;
                $.img.style.display = 'block';
                $.video.style.display = 'none';
            }
        };
        $.video.appendChild(source);
        $.video.style.display = 'block';
        $.img.style.display = 'none';
        $.video.load();
    } else if (best.type === 'image') {
        $.img.src = best.url;
        $.img.alt = `Imagen de ${hero.name}`;
        $.img.style.display = 'block';
        $.video.style.display = 'none';
    } else {
        $.img.style.display = 'none';
        $.video.style.display = 'none';
    }

    $.name.textContent = hero.name || 'Nombre no disponible';
    $.sub.textContent = hero.tagline || '';
    $.role.textContent = hero.role || '';
    $.universe.textContent = hero.universe || '';
    $.rarity.textContent = hero.rarity || '';

    // Escudos (muestran iniciales estilizadas)
    if ($.badgeRole) $.badgeRole.dataset.label = (hero.role || '').slice(0, 2).toUpperCase();
    if ($.badgeUniverse) $.badgeUniverse.dataset.label = (hero.universe || '').slice(0, 2).toUpperCase();

    const release = hero.release_date || hero.releaseDate;
    if (release) $.release.textContent = `Fecha de lanzamiento: ${release.slice(0, 10)}`;

    if (hero.prices) {
        $.prices.innerHTML = `
      ${hero.prices.gold ? `<span class="price chip">🪙 ${hero.prices.gold}</span>` : ''}
      ${hero.prices.gems ? `<span class="price chip">💎 ${hero.prices.gems}</span>` : ''}
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
