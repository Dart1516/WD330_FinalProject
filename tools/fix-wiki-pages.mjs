// tools/fix-wiki-pages.mjs
import fs from 'node:fs/promises';

const API = 'https://heroesofthestorm.fandom.com/api.php';

const EXCEPTIONS = {
    "Anubarak": "Anub'arak",
    "Ana": "Ana_(Overwatch)"
    // Agrega aquí más casos si detectas títulos con paréntesis o apóstrofes
};

async function searchTitle(q) {
    const url = `${API}?action=query&list=search&format=json&origin=*&srsearch=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.query?.search?.[0];
    return first?.title || null;
}

async function main() {
    const raw = await fs.readFile('./data/heroes.json', 'utf8'); // ojo: corrige el nombre del archivo si es "hroes.json"
    const db = JSON.parse(raw);

    const result = {};
    for (const [key, hero] of Object.entries(db)) {
        const current = (hero.wiki_page || '').trim();
        if (current) {
            result[key] = current;
            continue;
        }
        const base = EXCEPTIONS[hero.name] || EXCEPTIONS[key] || hero.name;
        let title = await searchTitle(base);

        // Heurística: si no encontró, prueba con "(Heroes of the Storm)"
        if (!title && !/\(Heroes_of_the_Storm\)/.test(base)) {
            title = await searchTitle(`${base} (Heroes of the Storm)`);
        }

        result[key] = title || base; // fallback al base si no encuentra
    }

    // Escribe un mapa de correcciones y/o un archivo parcheado
    await fs.writeFile('./data/wiki-map.json', JSON.stringify(result, null, 2), 'utf8');

    // Opcional: fusionar en el JSON original
    for (const [key, title] of Object.entries(result)) {
        if (!db[key]) continue;
        db[key].wiki_page = title;
        // Normaliza: elimina releaseDate duplicado si existiera
        if (db[key].releaseDate && !db[key].release_date) {
            db[key].release_date = db[key].releaseDate;
        }
        delete db[key].releaseDate;
    }
    await fs.writeFile('./data/heroes.patched.json', JSON.stringify(db, null, 2), 'utf8');

    console.log('Listo: data/wiki-map.json y data/heroes.patched.json generados.');
}

main().catch(console.error);
