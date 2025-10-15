// js/utils/wiki.js
// All comments in English. Sections ordered alphabetically (A, B, C...).

/* =========================================================
   A) TITLE NORMALIZATION (EXCEPTIONS)
   ========================================================= */
const TITLE_EXCEPTIONS = {
    "Cho gall": "Cho'gall",
    "Chogall": "Cho'gall",
    "DVa": "D.Va",
    "DV.a": "D.Va",
    "E.T.C": "E.T.C.",
    "ETC": "E.T.C.",
    "Kaelthas": "Kael'thas",
    "KelThuzad": "Kel'Thuzad",
    "Lucio": "Lúcio",
};

export function normalizeWikiTitle(nameOrTitle = "") {
    const raw = String(nameOrTitle).trim();
    return TITLE_EXCEPTIONS[raw] || raw;
}

/* =========================================================
   B) DESCRIPTIONS (MEDIAWIKI EXTRACTS)
   ========================================================= */
// Backwards-compatible helpers so heroes-details.js keeps working.

function resolveWikiTitle(hero) {
    // Prefer explicit wiki_page, then name
    return (hero?.wiki_page || hero?.name || '').trim();
}

async function fetchExtractEN(title) {
    const url =
        `https://heroesofthestorm.fandom.com/api.php` +
        `?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*` +
        `&redirects=1&titles=${encodeURIComponent(title)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return '';
        const data = await res.json();
        const pages = data?.query?.pages || {};
        const firstKey = Object.keys(pages)[0];
        const extract = firstKey ? (pages[firstKey]?.extract || '') : '';
        return (extract || '').trim();
    } catch {
        return '';
    }
}

export async function getHeroDescription(hero, { translateToEs = false } = {}) {
    const title = resolveWikiTitle(hero);
    if (!title) return '';

    const CACHE_KEY = `desc_en:${title}`;
    const cached = localStorage.getItem(CACHE_KEY);
    let text = cached || '';

    if (!text) {
        text = await fetchExtractEN(title);
        if (text) localStorage.setItem(CACHE_KEY, text);
    }

    if (!translateToEs || !text) return text;

    const TKEY = `desc_es:${title}`;
    const cachedES = localStorage.getItem(TKEY);
    if (cachedES) return cachedES;

    const es = await translateTextENtoES(text);
    if (es) localStorage.setItem(TKEY, es);
    return es || text;
}

// Optional translator (free MyMemory)
async function translateTextENtoES(text) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data?.responseData?.translatedText || '';
    } catch {
        return '';
    }
}

/* =========================================================
   C) IMAGES: SINGLE ORIGINAL BY TITLE
   ========================================================= */
export async function getOriginalImageByTitle(title) {
    const t = normalizeWikiTitle(title);
    if (!t) return '';

    const url =
        `https://heroesofthestorm.fandom.com/api.php` +
        `?action=query&format=json&origin=*` +
        `&redirects=1&prop=pageimages&piprop=original` +
        `&titles=${encodeURIComponent(t)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return '';
        const data = await res.json();
        const pages = data?.query?.pages || {};
        const firstKey = Object.keys(pages)[0];
        const original = firstKey ? pages[firstKey]?.original?.source : '';
        return original || '';
    } catch {
        return '';
    }
}

/* =========================================================
   D) IMAGES: BATCH ORIGINALS (<= 50 PER REQUEST)
   ========================================================= */
export async function getOriginalImagesForTitles(titles = []) {
    const out = {}; // { title: url }
    const clean = titles.map(normalizeWikiTitle).filter(Boolean);

    for (let i = 0; i < clean.length; i += 50) {
        const block = clean.slice(i, i + 50);
        const url =
            `https://heroesofthestorm.fandom.com/api.php` +
            `?action=query&format=json&origin=*` +
            `&redirects=1&prop=pageimages&piprop=original` +
            `&titles=${encodeURIComponent(block.join('|'))}`;

        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const pages = data?.query?.pages || {};
            for (const pid of Object.keys(pages)) {
                const p = pages[pid];
                const title = p?.title;
                const src = p?.original?.source || '';
                if (title) out[title] = src;
            }
        } catch {
            // noop
        }
    }
    return out;
}

/* =========================================================
   E) IMAGES: BATCH THUMBNAILS (FALLBACK)
   ========================================================= */
export async function getThumbnailsForTitles(titles = [], size = 360) {
    const out = {}; // { title: url }
    const clean = titles.map(normalizeWikiTitle).filter(Boolean);

    for (let i = 0; i < clean.length; i += 50) {
        const block = clean.slice(i, i + 50);
        const url =
            `https://heroesofthestorm.fandom.com/api.php` +
            `?action=query&format=json&origin=*` +
            `&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=${size}` +
            `&titles=${encodeURIComponent(block.join('|'))}`;

        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const pages = data?.query?.pages || {};
            for (const pid of Object.keys(pages)) {
                const p = pages[pid];
                const title = p?.title;
                const src = p?.thumbnail?.source || '';
                if (title) out[title] = src;
            }
        } catch {
            // noop
        }
    }
    return out;
}
