// tools/validate-extracts.mjs
import fs from 'node:fs/promises';

const API = 'https://heroesofthestorm.fandom.com/api.php';

async function getExtract(title) {
    const url = `${API}?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*&titles=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const k = Object.keys(pages)[0];
    return k ? (pages[k]?.extract || '') : '';
}

(async () => {
    const raw = await fs.readFile('./data/heroes.json', 'utf8');
    const db = JSON.parse(raw);
    const failed = [];

    for (const [name, h] of Object.entries(db)) {
        const title = (h.wiki_page || '').trim();
        if (!title) { failed.push({ name, reason: 'missing wiki_page' }); continue; }
        const extract = await getExtract(title);
        if (!extract) failed.push({ name, title, reason: 'empty extract' });
    }

    console.log('Faltantes/errores:', failed);
})();
