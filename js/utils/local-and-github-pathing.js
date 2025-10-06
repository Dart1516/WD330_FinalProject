// Fix to work on   local and in GitHub Pages)

export const REPO_BASE = location.hostname.endsWith('github.io')
    ? `/${location.pathname.split('/')[1] || ''}`
    : '';

export function toRootPath(path) {
    if (!path) return '/';
    const p = path.startsWith('/') ? path : `/${path}`;
    return (REPO_BASE && p.startsWith(REPO_BASE + '/')) ? p.slice(REPO_BASE.length) : p;
}

export function fromRoot(path) {
    return `${REPO_BASE}${toRootPath(path)}`;
}

// comapre file name only
export function pathKey(pathname) {
    let p = pathname || '/';
    if (REPO_BASE && p.startsWith(REPO_BASE)) p = p.slice(REPO_BASE.length) || '/';
    if (p === '/' || p === '') return 'index.html';
    const clean = p.replace(/\/+$/, '');
    const last = clean.split('/').pop();
    return last ? last.toLowerCase() : 'index.html';
}

/** just to debug */
console.log('[Pathing] Running on', location.hostname, '| REPO_BASE:', REPO_BASE);

