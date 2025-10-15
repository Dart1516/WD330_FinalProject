// js/features/heroes-data.js
// All comments in English.

/* =========================================================
   0) PUBLIC SURFACE
   - Exports: getAllHeroes(), DataConfig
   ========================================================= */

/**
 * @typedef {Object} Hero
 * @property {string|number} id
 * @property {string} name
 * @property {string} short_name
 * @property {string} alt_name
 * @property {string} role
 * @property {string} new_role
 * @property {string} type
 * @property {string} release_date
 * @property {string|null} rework_date
 * @property {string|number} attribute_id
 * @property {Object} translations
 * @property {string} universe
 * @property {string} portrait
 * @property {string} description_short
 */


/* =========================================================
   1) CONFIG
   - Toggle data source and repo-aware base path
   ========================================================= */
const USE_LOCAL = false;                     // try API first, then fallback to local JSON
const REPO_NAME = 'WD330_FinalProject';      // GitHub Pages repository name
const GH_BASE = location.hostname.endsWith('github.io') ? `/${REPO_NAME}` : '';
const BASE_PATH = (typeof window !== 'undefined' && window.REPO_BASE) ? window.REPO_BASE : GH_BASE;

// Netlify serverless proxy (token is added server-side)
const API_PROXY = '/api/heroes';


/* =========================================================
   2) HELPERS
   - URL join, input coercion, small utils
   ========================================================= */
function joinPublic(path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_PATH}${p}`.replace(/\/{2,}/g, '/');
}

function ensureLeadingSlash(p) {
    return p.startsWith('/') ? p : `/${p.replace(/^(\.\/)?/, '')}`;
}

/** Coerce arbitrary JSON into an array of heroes */
function toArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.heroes)) return raw.heroes;
    if (raw && Array.isArray(raw.data)) return raw.data;

    if (raw && typeof raw === 'object') {
        const vals = Object.values(raw);
        if (vals.length === 0) return [];
        return Array.isArray(vals[0]) ? vals.flat() : vals;
    }
    return [];
}


/* =========================================================
   3) FETCHERS
   - Local JSON and remote API
   ========================================================= */
async function fetchLocalHeroes() {
    const url = joinPublic('/data/heroes.json');
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`Failed to fetch local JSON: ${res.status}`);
    const raw = await res.json();
    return toArray(raw);
}

async function fetchApiHeroes() {
    // Call Netlify function (adds HP_TOKEN on the server)
    const res = await fetch(`${API_PROXY}?mode=json`, { credentials: 'omit' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const raw = await res.json();
    const list = toArray(raw);
    return mapFromApi(list);
}

/** Map HeroesProfile /Heroes to our internal shape */
function mapFromApi(list) {
    return list.map((x) => {
        const short =
            x.short_name ||
            (x.name ? x.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '') : '');

        return {
            id: x.id,
            slug: x.short_name || short,
            name: x.name,
            short_name: short,
            alt_name: x.alt_name ?? null,
            role: x.role,
            new_role: x.new_role || x.role,
            type: x.type ?? null,
            release_date: x.release_date ?? null,
            rework_date: x.rework_date ?? null,
            attribute_id: x.attribute_id ?? null,
            translations: x.translations ?? [],
            // /Heroes does not include universe or portrait.
            universe: 'Nexus',
            portrait: `/assets/img/heroes/${short}.webp`,
            description_short: '',
        };
    });
}


/* =========================================================
   4) NORMALIZER
   - Unify fields and fix portrait paths
   ========================================================= */
function normalizeHeroes(list) {
    return list.map((h) => {
        const short =
            h.short_name ||
            h.shortName ||
            h.short ||
            (h.name ? h.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '') : '');

        const portraitSrc = h.portrait
            ? ensureLeadingSlash(String(h.portrait))
            : `/assets/img/heroes/${short}.webp`;

        return {
            ...h,
            short_name: short,
            portrait: joinPublic(portraitSrc),
            description_short: h.description_short || h.description || '',
        };
    });
}


/* =========================================================
   5) MAIN API
   ========================================================= */
export async function getAllHeroes() {
    try {
        const rawList = USE_LOCAL ? await fetchLocalHeroes() : await fetchApiHeroes();
        return normalizeHeroes(rawList);
    } catch (e) {
        console.warn('[heroes-data] API failed, falling back to local JSON:', e);
        const rawList = await fetchLocalHeroes();
        return normalizeHeroes(rawList);
    }
}

export const DataConfig = { USE_LOCAL, BASE_PATH, joinPublic };
