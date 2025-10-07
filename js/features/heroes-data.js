// js/feature/heroes-data.js
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
const USE_LOCAL = true;                      // flip to false when wiring real API
const REPO_NAME = 'WD330_FinalProject';      // GitHub Pages repository name
const GH_BASE = location.hostname.endsWith('github.io') ? `/${REPO_NAME}` : '';
const BASE_PATH = (typeof window !== 'undefined' && window.REPO_BASE) ? window.REPO_BASE : GH_BASE;


/* =========================================================
   2) HELPERS
   - URL join, input coercion, small utils
   ========================================================= */
function joinPublic(path) {
    // Ensure leading slash and prevent double slashes
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
   - Local JSON today, remote API tomorrow
   ========================================================= */
async function fetchLocalHeroes() {
    const url = joinPublic('/data/heroes.json');
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`Failed to fetch local JSON: ${res.status}`);
    const raw = await res.json();
    return toArray(raw);
}

async function fetchApiHeroes() {
    // Placeholder for future Heroes Profile API.
    // Keep same output shape as normalizeHeroes().
    // Example:
    // const res = await fetch('https://api.heroesprofile.com/…', { headers: { 'x-api-key': '...' }});
    // const raw = await res.json();
    // return toArray(mapFromApi(raw));
    throw new Error('Remote API not implemented yet');
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
    const rawList = USE_LOCAL ? await fetchLocalHeroes() : await fetchApiHeroes();
    return normalizeHeroes(rawList);
}

export const DataConfig = { USE_LOCAL, BASE_PATH, joinPublic };
