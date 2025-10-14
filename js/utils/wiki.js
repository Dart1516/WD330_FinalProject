// js/utils/wiki.js
// MediaWiki client (Fandom) — EN only to avoid SSL error on es.*
// If you want Spanish text, translate after fetching (see translate helper below).

// Map only if your JSON doesn't include a correct wiki_page
const TITLE_MAP = {
    // 'Alafeliz': 'Brightwing',
};

function resolveWikiTitle(hero) {
    return (hero.wiki_page || TITLE_MAP[hero.name] || hero.name || '').trim();
}

async function fetchExtractEN(title) {
    const url =
        `https://heroesofthestorm.fandom.com/api.php` +
        `?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*` +
        `&titles=${encodeURIComponent(title)}`;

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

    // Optional: translate EN → ES using MyMemory (free)
    const TKEY = `desc_es:${title}`;
    const cachedES = localStorage.getItem(TKEY);
    if (cachedES) return cachedES;

    const es = await translateTextENtoES(text);
    if (es) localStorage.setItem(TKEY, es);
    return es || text;
}

// --- Simple free translator (MyMemory). Remove if not needed.
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
