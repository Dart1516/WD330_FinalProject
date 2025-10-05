import { fromRoot } from './local-and-github-pathing.js';

export async function fetchPartial(rootPath, { cache = 'no-cache' } = {}) {
    const url = fromRoot(rootPath);
    const res = await fetch(url, { cache });
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.text();
}
