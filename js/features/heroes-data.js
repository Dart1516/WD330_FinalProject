
/* =========================================================
   A) TYPES (PUBLIC SURFACE)
   ========================================================= */
/** @typedef {Object} Hero
 *  @property {string|number} id
 *  @property {string} name
 *  @property {string} short_name
 *  @property {string|null} alt_name
 *  @property {string} role
 *  @property {string} new_role
 *  @property {string|null} type
 *  @property {string|null} release_date
 *  @property {string|null} rework_date
 *  @property {string|number|null} attribute_id
 *  @property {Array<string>|Object} translations
 *  @property {string} universe
 *  @property {string} portrait
 *  @property {string} description_short
 */

/* =========================================================
   B) CONFIG
   ========================================================= */
const REPO_NAME = 'WD330_FinalProject';
const GH_BASE = location.hostname.endsWith('github.io') ? `/${REPO_NAME}` : '';
const BASE_PATH = (typeof window !== 'undefined' && window.REPO_BASE) ? window.REPO_BASE : GH_BASE;

const IS_NETLIFY =
    location.hostname.endsWith('.netlify.app') ||
    (location.hostname === 'localhost' && location.port === '8888');

const API_PROXY = '/api/heroes';
const API_DIRECT = 'https://api.heroesprofile.com/api/Heroes';

// Local data paths (adjust if needed)
const LOCAL_HEROES_JSON = '/data/heroes.json';
const LOCAL_UNIVERSES_JSON = '/data/heroes.json';

/* =========================================================
   C) HELPERS
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
const _universeMapCache = { map: null, loaded: false };

function toKeyLower(s) {
    return String(s || '').trim().toLowerCase();
}
function slugifyHyphen(name = '') {
    return String(name)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function variantsForSlug(s) {
    // Creates tolerant variants: with hyphen, without hyphen, underscores, etc.
    const a = toKeyLower(s);
    const noDash = a.replace(/-/g, '');
    const noUnd = a.replace(/_/g, '');
    const noDashUnd = noUnd.replace(/-/g, '');
    return [a, a.replace(/_/g, '-'), noDash, noUnd, noDashUnd];
}

/* =========================================================
   D) DATA LOADERS
   ========================================================= */
async function loadUniverseMap() {
    if (_universeMapCache.loaded && _universeMapCache.map) return _universeMapCache.map;

    const url = joinPublic(LOCAL_UNIVERSES_JSON);
    const map = new Map();

    try {
        const res = await fetch(url, { credentials: 'omit' });
        if (!res.ok) throw new Error(`Failed universes JSON: ${res.status}`);
        /** Shape: { "Abathur": { slug, universe, wiki_page, ... }, ... } */
        const data = await res.json();

        for (const [name, h] of Object.entries(data || {})) {
            if (!h) continue;
            const uni = String(h.universe || 'Nexus').trim();
            // Index by multiple tolerant keys
            const nameKey = toKeyLower(name);
            const wikiKey = toKeyLower(h.wiki_page);
            const slugKey = toKeyLower(h.slug);
            if (nameKey) map.set(nameKey, uni);
            if (wikiKey) map.set(wikiKey, uni);
            if (slugKey) {
                for (const v of variantsForSlug(slugKey)) map.set(v, uni);
            }
            // Also index by slugified name (hyphen style)
            if (nameKey) {
                const nameSlug = slugifyHyphen(name);
                for (const v of variantsForSlug(nameSlug)) map.set(v, uni);
            }
        }
    } catch (e) {
        console.warn('[heroes-data] Universe map unavailable, keeping Nexus defaults:', e);
    }

    _universeMapCache.map = map;
    _universeMapCache.loaded = true;
    return map;
}

/* =========================================================
   E) FETCHERS
   ========================================================= */
async function fetchLocalHeroes() {
    const url = joinPublic(LOCAL_HEROES_JSON);
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`Failed to fetch local JSON: ${res.status}`);
    const raw = await res.json();
    const arr = toArray(raw);

    // Enrich local too (in case universe is missing there)
    const uniMap = await loadUniverseMap();
    return arr.map((h) => enrichUniverseFromMap(h, uniMap));
}

async function fetchApiHeroes() {
    // Netlify → proxy (token server-side)
    if (IS_NETLIFY) {
        const res = await fetch(`${API_PROXY}?mode=json`, { credentials: 'omit' });
        if (!res.ok) throw new Error(`API error (proxy): ${res.status}`);
        const raw = await res.json();
        const uniMap = await loadUniverseMap();
        return mapFromApi(toArray(raw), uniMap);
    }

    // Local dev → direct API with local token
    const token =
        (window.HP && window.HP.API_TOKEN) ||
        localStorage.getItem('HP_API_TOKEN') ||
        '';
    if (!token) throw new Error('Missing API token for local dev. Create js/config.local.js');

    const url = `${API_DIRECT}?mode=json&api_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`API error (direct): ${res.status}`);
    const raw = await res.json();
    const uniMap = await loadUniverseMap();
    return mapFromApi(toArray(raw), uniMap);
}

/** Use universe from our local JSON right here */
function mapFromApi(list, uniMap) {
    return list.map((x) => {
        const short =
            x.short_name ||
            (x.name
                ? x.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '')
                : '');

        // Build tolerant keys to query the universe map
        const apiSlug = toKeyLower(x.short_name || x.slug);
        const apiName = toKeyLower(x.name);
        const nameHyphen = slugifyHyphen(x.name || '');
        const keys = [
            ...variantsForSlug(apiSlug),
            apiName,
            nameHyphen,
        ];

        let uni = null;
        for (const k of keys) {
            if (k && uniMap.has(k)) { uni = uniMap.get(k); break; }
        }
        if (!uni) uni = 'Nexus';

        return {
            id: x.id,
            slug: x.short_name || short, // keep original behavior
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
            universe: uni, // <- now resolved from our JSON
            description_short: '',
        };
    });
}

/* Also enrich any object (local or API-mapped) with universe */
function enrichUniverseFromMap(h, uniMap) {
    const slugKey = toKeyLower(h.slug || h.short_name);
    const nameKey = toKeyLower(h.name);
    const wikiKey = toKeyLower(h.wiki_page);
    const hyphenName = slugifyHyphen(h.name || '');
    const keys = [
        ...variantsForSlug(slugKey),
        nameKey,
        wikiKey,
        hyphenName,
    ];
    let uni = h.universe && String(h.universe).trim();
    if (!uni) {
        for (const k of keys) {
            if (k && uniMap.has(k)) { uni = uniMap.get(k); break; }
        }
    }
    return { ...h, universe: uni || 'Nexus' };
}

/* =========================================================
   F) NORMALIZER & MAIN
   ========================================================= */
function normalizeHeroes(list) {
    return list.map((h) => {
        const short =
            h.short_name ||
            h.shortName ||
            h.short ||
            (h.name
                ? h.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '')
                : '');

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

export async function getAllHeroes() {
    try {
        const apiList = await fetchApiHeroes();          // already enriched in mapFromApi
        return normalizeHeroes(apiList);
    } catch (e) {
        console.warn('[heroes-data] API failed, falling back to local JSON:', e);
        const localList = await fetchLocalHeroes();      // enriched via enrichUniverseFromMap
        return normalizeHeroes(localList);
    }
}

/* =========================================================
   G) EXPORTS
   ========================================================= */
export const DataConfig = { BASE_PATH, joinPublic };
