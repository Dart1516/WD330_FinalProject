// js/features/heroes-data.js
// All comments in English.

/* =========================================================
   0) PUBLIC SURFACE
   ========================================================= */
/** @typedef {Object} Hero
 *  @property {string|number} id
 *  @property {string} name
 *  @property {string} short_name
 *  @property {string} alt_name
 *  @property {string} role
 *  @property {string} new_role
 *  @property {string} type
 *  @property {string} release_date
 *  @property {string|null} rework_date
 *  @property {string|number} attribute_id
 *  @property {Object} translations
 *  @property {string} universe
 *  @property {string} portrait
 *  @property {string} description_short
 */

/* =========================================================
   1) CONFIG
   ========================================================= */
const REPO_NAME = 'WD330_FinalProject';
const GH_BASE = location.hostname.endsWith('github.io') ? `/${REPO_NAME}` : '';
const BASE_PATH = (typeof window !== 'undefined' && window.REPO_BASE) ? window.REPO_BASE : GH_BASE;

// Detect environment:
// - Netlify prod: *.netlify.app
// - Netlify dev: localhost:8888 (default port)
// In those cases we use the proxy (/api/heroes). Otherwise (e.g. 127.0.0.1:5501) use direct API with local token.
const IS_NETLIFY =
    location.hostname.endsWith('.netlify.app') ||
    (location.hostname === 'localhost' && location.port === '8888');

const API_PROXY = '/api/heroes';
const API_DIRECT = 'https://api.heroesprofile.com/api/Heroes';

/* =========================================================
   2) HELPERS
   ========================================================= */
function joinPublic(path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_PATH}${p}`.replace(/\/{2,}/g, '/');
}

function ensureLeadingSlash(p) {
    return p.startsWith('/') ? p : `/${p.replace(/^(\.\/)?/, '')}`;
}

function toArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.heroes)) return raw.heroes;
    if (raw && Array.isArray(raw.data)) return raw.data;
    if (raw && typeof raw === 'object') {
        const vals = Object.values(raw);
        if (!vals.length) return [];
        return Array.isArray(vals[0]) ? vals.flat() : vals;
    }
    return [];
}

/* =========================================================
   3) FETCHERS
   ========================================================= */
async function fetchLocalHeroes() {
    const url = joinPublic('/data/heroes.json');
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`Failed to fetch local JSON: ${res.status}`);
    const raw = await res.json();
    return toArray(raw);
}

async function fetchApiHeroes() {
    // Netlify env → use proxy (token stays server-side)
    if (IS_NETLIFY) {
        const res = await fetch(`${API_PROXY}?mode=json`, { credentials: 'omit' });
        if (!res.ok) throw new Error(`API error (proxy): ${res.status}`);
        const raw = await res.json();
        return mapFromApi(toArray(raw));
    }

    // Local dev (e.g., Live Server): use direct API with local token
    const token =
        (window.HP && window.HP.API_TOKEN) ||
        localStorage.getItem('HP_API_TOKEN') ||
        '';
    if (!token) throw new Error('Missing API token for local dev. Create js/config.local.js');

    const url = `${API_DIRECT}?mode=json&api_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`API error (direct): ${res.status}`);
    const raw = await res.json();
    return mapFromApi(toArray(raw));
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
            universe: 'Nexus',                         // not provided by /Heroes
            
            description_short: '',
        };
    });
}

/* =========================================================
   4) NORMALIZER
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
        const rawList = await fetchApiHeroes();
        return normalizeHeroes(rawList);
    } catch (e) {
        console.warn('[heroes-data] API failed, falling back to local JSON:', e);
        const rawList = await fetchLocalHeroes();
        return normalizeHeroes(rawList);
    }
}

export const DataConfig = { BASE_PATH, joinPublic };
