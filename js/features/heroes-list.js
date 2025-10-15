
import { getAllHeroes, DataConfig } from './heroes-data.js';

/* =========================================================
   A) CONSTANTS & MAPPINGS
   ========================================================= */
const $ = {
    grid: document.getElementById('grid'),
    count: document.getElementById('results-count'),
    search: document.getElementById('hero-search'),
    clear: document.getElementById('clear-filters'),
    chipsWrap: document.getElementById('active-chips'),
    tplSkeleton: document.getElementById('tpl-skeleton'),
    tplEmpty: document.getElementById('tpl-empty'),
    tplError: document.getElementById('tpl-error'),
    sheet: document.getElementById('mobile-sheet'),
    emblemBar: document.getElementById('emblem-bar'),
};

const ROLE_BY_CLASS = {
    'role-ass-melee': 'Melee Assassin',
    'role-ass-range': 'Ranged Assassin',
    'role-healer': 'Healer',
    'role-support': 'Support',
    'role-tank': 'Tank',
    'role-warrior': 'Bruiser',
};

const ROLE_CLASS_BY_TOKEN = {
    'Bruiser': 'role-warrior',
    'Healer': 'role-healer',
    'Melee Assassin': 'role-ass-melee',
    'Ranged Assassin': 'role-ass-range',
    'Support': 'role-support',
    'Tank': 'role-tank',
};

const UNI_CLASS_BY_TOKEN = {
    'Diablo': 'uni-diablo',
    'Nexus': 'uni-nexus',
    'Overwatch': 'uni-overwatch',
    'StarCraft': 'uni-starcraft',
    'Warcraft': 'uni-warcraft',
};

const UNIVERSE_BY_CLASS = {
    'uni-diablo': 'Diablo',
    'uni-nexus': 'Nexus',
    'uni-overwatch': 'Overwatch',
    'uni-starcraft': 'StarCraft',
    'uni-warcraft': 'Warcraft',
};

const IS_TOUCH = matchMedia('(hover: none)').matches;

const state = {
    all: /** @type {import('./heroes-data.js').Hero[]} */([]),
    list: [],
    roles: new Set(),
    universes: new Set(),
    text: '',
};

/* =========================================================
   B) BOOT / STARTUP
   ========================================================= */
boot().catch(showError);

async function boot() {
    renderSkeletons(8);
    bindFilterChips();
    bindSearch();
    bindClear();
    bindSheet();

    try {
        // 1) Load heroes (API or local) via data layer.
        state.all = await getAllHeroes();

        // 2) Ensure universe is correct (overwrite from local JSON).
        await hydrateUniversesFromLocal(state.all);

        // 3) Attach local portrait path based on slug.
        state.all.forEach((h) => {
            const slug = h.slug || (h.name ?? '').toLowerCase().replace(/\s+/g, '-');
            h.slug = slug;
            h.portrait = `/assets/img/heroes/${slug}.webp`;
        });

        // Debug (optional): confirm distinct universes after hydration.
        // console.debug('[heroes-list] universes seen:', [...new Set(state.all.map(h => h.universe))]);
    } catch (err) {
        showError(err);
        return;
    }

    applyFilters();
    updateCount(state.list.length);
}

/* =========================================================
   C) DATA HYDRATION (UNIVERSES FROM LOCAL JSON)
   ========================================================= */
async function hydrateUniversesFromLocal(list) {
    const url = DataConfig.joinPublic('/data/heroes.json');

    try {
        const res = await fetch(url, { credentials: 'omit' });
        if (!res.ok) {
            console.warn('[heroes-list] universe JSON not found:', res.status, url);
            return;
        }

        /** Shape: { "Abathur": { slug, universe, wiki_page, ... }, ... } */
        const data = await res.json();

        // Build a tolerant lookup (by slug, name, and wiki_page).
        const uniMap = new Map();
        for (const [name, h] of Object.entries(data || {})) {
            if (!h) continue;
            const uni = String(h.universe || 'Nexus').trim();
            if (h.slug) uniMap.set(String(h.slug).toLowerCase(), uni);
            if (name) uniMap.set(String(name).toLowerCase(), uni);
            if (h.wiki_page) uniMap.set(String(h.wiki_page).toLowerCase(), uni);
        }

        // Overwrite each hero's universe using the most reliable key available.
        list.forEach((h) => {
            const slugKey = String(h.slug || h.short_name || '').toLowerCase();
            const nameKey = String(h.name || '').toLowerCase();
            const wikiKey = String(h.wiki_page || '').toLowerCase();

            const patched =
                uniMap.get(slugKey) ||
                uniMap.get(nameKey) ||
                (wikiKey && uniMap.get(wikiKey)) ||
                h.universe || 'Nexus';

            h.universe = patched;
        });
    } catch (e) {
        console.warn('[heroes-list] failed to hydrate universes from local JSON', e);
    }
}

/* =========================================================
   D) BINDINGS (FILTERS & SEARCH)
   ========================================================= */
function bindFilterChips() {
    if (!$.emblemBar) return;

    const handleToggle = (item) => {
        if (!item || !item.classList.contains('emblem')) return;

        const roleToken = getRoleToken(item);
        const uniToken = getUniverseToken(item);

        if (roleToken) toggle(item, state.roles, roleToken);
        if (uniToken) toggle(item, state.universes, uniToken);

        const pressed = item.getAttribute('aria-pressed') === 'true';
        item.classList.toggle('active', pressed);

        applyFilters();
    };

    $.emblemBar.addEventListener('click', (e) => {
        const item = /** @type {HTMLElement} */(e.target.closest('.emblem'));
        if (!item || !$.emblemBar.contains(item)) return;
        handleToggle(item);
    });

    $.emblemBar.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const item = /** @type {HTMLElement} */(e.target.closest('.emblem'));
        if (!item || !$.emblemBar.contains(item)) return;
        e.preventDefault();
        handleToggle(item);
    });
}

function bindSearch() {
    if (!$.search) return;
    let t = 0;
    $.search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            state.text = $.search.value.trim();
            applyFilters();
        }, 120);
    });
}

function bindClear() {
    if (!$.clear) return;
    $.clear.addEventListener('click', () => {
        state.roles.clear();
        state.universes.clear();
        state.text = '';
        if ($.search) $.search.value = '';

        if ($.emblemBar) {
            $.emblemBar.querySelectorAll('.emblem').forEach((el) => {
                el.setAttribute('aria-pressed', 'false');
                el.classList.remove('active');
            });
        }

        applyFilters();
    });
}

/* =========================================================
   E) FILTERS (APPLY & HELPERS)
   ========================================================= */
function applyFilters() {
    const q = state.text.toLowerCase();

    state.list = state.all.filter((h) => {
        // Text search
        if (q) {
            const hay = `${h.name} ${h.alt_name ?? ''} ${h.short_name ?? ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }

        // Roles (OR). Accept umbrella cases.
        if (state.roles.size) {
            const heroRole = String(h.new_role || h.role || '').trim();

            const selected = [...state.roles];
            const roleOk =
                selected.some(r => r.toLowerCase().trim() === heroRole.toLowerCase()) ||
                (heroRole === 'Assassin' && (selected.includes('Melee Assassin') || selected.includes('Ranged Assassin'))) ||
                (heroRole === 'Warrior' && (selected.includes('Tank') || selected.includes('Bruiser'))) ||
                (selected.includes('Assassin') && (heroRole === 'Melee Assassin' || heroRole === 'Ranged Assassin')) ||
                (selected.includes('Warrior') && (heroRole === 'Tank' || heroRole === 'Bruiser'));

            if (!roleOk) return false;
        }

        // Universes (OR)
        if (state.universes.size) {
            const heroUni = String(h.universe || '').trim().toLowerCase();
            const uniOk = [...state.universes].some(u => u.toLowerCase().trim() === heroUni);
            if (!uniOk) return false;
        }

        return true;
    });

    renderGrid(state.list);
    renderActiveChips();
    updateCount(state.list.length);
}

function getRoleToken(el) {
    for (const cls of el.classList) {
        if (ROLE_BY_CLASS[cls]) return ROLE_BY_CLASS[cls];
    }
    return null;
}

function getUniverseToken(el) {
    for (const cls of el.classList) {
        if (UNIVERSE_BY_CLASS[cls]) return UNIVERSE_BY_CLASS[cls];
    }
    return null;
}

function toggle(btn, set, value) {
    if (set.has(value)) {
        set.delete(value);
        btn.setAttribute('aria-pressed', 'false');
    } else {
        set.add(value);
        btn.setAttribute('aria-pressed', 'true');
    }
}

/* =========================================================
   F) GRID (RENDER)
   ========================================================= */
function renderGrid(items) {
    $.grid.setAttribute('aria-busy', 'false');
    $.grid.innerHTML = '';

    if (!items.length) {
        if ($.tplEmpty) $.grid.append($.tplEmpty.content.cloneNode(true));
        return;
    }

    const frag = document.createDocumentFragment();

    for (const hero of items) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.dataset.universe = hero.universe;
        card.dataset.id = String(hero.id);
        card.dataset.role = hero.new_role || hero.role;
        card.dataset.slug = hero.slug || hero.short_name || (hero.name ?? '').toLowerCase();

        // Image (local)
        const img = document.createElement('img');
        img.alt = hero.name || '';
        img.loading = 'lazy';
        img.decoding = 'async';

        const localPortrait =
            hero.portrait ||
            hero.images?.portrait ||
            `/assets/img/heroes/${hero.slug}.webp`;

        img.src = localPortrait;
        img.srcset = `${localPortrait} 1x`;
        img.sizes = '(max-width: 720px) 50vw, 25vw';
        img.onerror = () => { img.src = '/assets/img/heroes/placeholder.webp'; };

        card.append(img);

        // Navigation
        const go = () => goToDetails(hero);

        if (IS_TOUCH) {
            card.addEventListener('click', go);
        } else {
            attachPopover(card, hero);
            card.addEventListener('click', go);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                }
            });
        }

        frag.append(card);
    }

    $.grid.append(frag);
}

function renderSkeletons(n) {
    $.grid.setAttribute('aria-busy', 'true');
    $.grid.innerHTML = '';
    if (!$.tplSkeleton) return;
    for (let i = 0; i < n; i++) $.grid.append($.tplSkeleton.content.cloneNode(true));
}

function renderActiveChips() {
    if (!$.chipsWrap) return;
    const chips = [];
    if (state.text) chips.push(`Text: “${state.text}”`);
    if (state.roles.size) chips.push(...[...state.roles].map(r => `Role: ${r}`));
    if (state.universes.size) chips.push(...[...state.universes].map(u => `Universe: ${u}`));
    $.chipsWrap.innerHTML = chips.map(t => `<span class="chip">${t}</span>`).join('');
}

function updateCount(n) {
    if ($.count) $.count.textContent = String(n);
}

/* =========================================================
   G) NAVIGATION
   ========================================================= */
function goToDetails(hero) {
    const slug = hero.slug || hero.short_name || String(hero.id);
    const url = DataConfig.joinPublic(`/pages/heroes-details.html?slug=${encodeURIComponent(slug)}`);
    window.location.assign(url);
}

/* =========================================================
   H) POPOVER (DESKTOP)
   ========================================================= */
function attachPopover(card, hero) {
    let timer = 0;
    let pop = null;

    const open = () => {
        if (pop) return;
        pop = buildPopover(hero);
        document.body.append(pop);
        placePopover(pop, card);
        requestAnimationFrame(() => (pop.dataset.open = 'true'));
        const onRecalc = () => pop && placePopover(pop, card);
        window.addEventListener('scroll', onRecalc, { passive: true, once: true });
        window.addEventListener('resize', onRecalc, { passive: true, once: true });
        document.addEventListener('keydown', (e) => e.key === 'Escape' && close(), { once: true });
    };

    const close = () => {
        if (!pop) return;
        pop.dataset.open = 'false';
        const node = pop;
        pop = null;
        setTimeout(() => node.remove(), 160);
    };

    const onEnter = () => (timer = window.setTimeout(open, 110));
    const onLeave = () => { clearTimeout(timer); close(); };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('focus', onEnter);
    card.addEventListener('blur', onLeave);
}

function buildPopover(hero) {
    const node = document.createElement('div');
    node.className = 'popover';
    node.innerHTML = `
    <p class="title">${escapeHTML(hero.name)}</p>
    <div class="meta">
      <span>${iconRole(hero.new_role || hero.role)} ${escapeHTML(hero.new_role || hero.role)}</span>
      <span>•</span>
      <span>${iconUniverse(hero.universe)} ${escapeHTML(hero.universe)}</span>
    </div>
    ${hero.description_short ? `<p class="desc">${escapeHTML(hero.description_short)}</p>` : ''}
  `;
    return node;
}

function placePopover(pop, card) {
    const r = card.getBoundingClientRect();
    const m = 8;
    pop.style.left = `${Math.round(r.right + m + scrollX)}px`;
    pop.style.top = `${Math.round(r.top - 10 + scrollY)}px`;

    const pr = pop.getBoundingClientRect();
    if (pr.right > innerWidth - 8) pop.style.left = `${Math.round(r.right - pr.width + scrollX)}px`;
    if (pr.top < 8) pop.style.top = `${Math.round(r.bottom + m + scrollY)}px`;
}

/* =========================================================
   I) SHEET (MOBILE)
   ========================================================= */
function bindSheet() {
    if (!$.sheet) return;
    const close = () => $.sheet.open && $.sheet.close();
    $.sheet.querySelector('.sheet-close')?.addEventListener('click', close);
    $.sheet.addEventListener('click', (e) => { if (e.target === $.sheet) close(); });
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

/* =========================================================
   J) UTILS (ICONS & ESCAPERS)
   ========================================================= */
function iconRole(role) {
    const cls = ROLE_CLASS_BY_TOKEN[role] || 'role-ass-melee';
    return `<span class="badge ${cls}" aria-hidden="true"></span>`;
}

function iconUniverse(u) {
    const cls = UNI_CLASS_BY_TOKEN[u] || 'uni-nexus';
    return `<span class="badge ${cls}" aria-hidden="true"></span>`;
}

function escapeHTML(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/* =========================================================
   K) ERROR STATE
   ========================================================= */
function showError(err) {
    console.error(err);
    $.grid.innerHTML = '';
    if ($.tplError) $.grid.append($.tplError.content.cloneNode(true));
}
