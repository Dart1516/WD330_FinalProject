// js/features/heroes-list.js
// All comments in English. Sections ordered alphabetically (A, B, C...).

import { getAllHeroes, DataConfig } from './heroes-data.js';
import {
    getOriginalImagesForTitles,
    getThumbnailsForTitles,
    normalizeWikiTitle,
} from '../utils/wiki.js';

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
        // Load local heroes (or LocalFirst per your data layer)
        state.all = await getAllHeroes();

        // Hydrate heroes with Fandom images (original -> thumbnail fallback)
        await hydrateImagesFromFandom(state.all);
    } catch (err) {
        showError(err);
        return;
    }

    applyFilters();
    updateCount(state.list.length);
}

/* =========================================================
   C) BINDINGS: FILTERS & SEARCH
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
   D) FILTERS: APPLY & HELPERS
   ========================================================= */
function applyFilters() {
    const q = state.text.toLowerCase();

    state.list = state.all.filter((h) => {
        // Text search
        if (q) {
            const hay = `${h.name} ${h.alt_name ?? ''} ${h.short_name ?? ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        // Roles (OR). If hero role is "Assassin", accept Melee/Ranged Assassin selections as well.
        if (state.roles.size) {
            const heroRole = h.new_role || h.role;
            const roleOk =
                state.roles.has(heroRole) ||
                (heroRole === 'Assassin' &&
                    (state.roles.has('Melee Assassin') || state.roles.has('Ranged Assassin')));
            if (!roleOk) return false;
        }
        // Universe (OR)
        if (state.universes.size && !state.universes.has(h.universe)) return false;
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
   E) GRID RENDER
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

        // --- Image choice: Fandom original/thumbnail -> local portrait -> placeholder
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';

        const localPortrait =
            hero.portrait ||
            hero.images?.portrait ||
            `/assets/img/heroes/${hero.slug}.webp`;

        const chosen = hero.fandom_image || localPortrait;

        img.src = chosen;
        img.srcset = `${chosen} 1x`;
        img.sizes = '(max-width: 720px) 50vw, 25vw';
        img.onerror = () => { img.src = '/assets/img/heroes/placeholder.webp'; };

        card.append(img);

        // --- Events
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
   F) NAVIGATION
   ========================================================= */
function goToDetails(hero) {
    const slug = hero.slug || hero.short_name || String(hero.id);
    const url = DataConfig.joinPublic(`/pages/heroes-details.html?slug=${encodeURIComponent(slug)}`);
    window.location.assign(url);
}

/* =========================================================
   G) POPOVER (DESKTOP)
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
   H) SHEET (MOBILE)
   ========================================================= */
function bindSheet() {
    if (!$.sheet) return;
    const close = () => $.sheet.open && $.sheet.close();
    $.sheet.querySelector('.sheet-close')?.addEventListener('click', close);
    $.sheet.addEventListener('click', (e) => { if (e.target === $.sheet) close(); });
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

/* =========================================================
   I) UTILS (ICONS & ESCAPERS)
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
   J) WIKI: FANDOM IMAGES HYDRATION
   ========================================================= */
async function hydrateImagesFromFandom(list) {
    const titles = list
        .map(h => normalizeWikiTitle(h.wiki_page || h.name))
        .filter(Boolean);

    // 1) Try originals (large)
    const originals = await getOriginalImagesForTitles(titles);

    // 2) Missing originals -> try thumbnails
    const missing = titles.filter(t => !originals[t]);
    let thumbs = {};
    if (missing.length) {
        thumbs = await getThumbnailsForTitles(missing, 480);
    }

    // 3) Attach to hero objects (as `fandom_image`)
    for (const hero of list) {
        const t = normalizeWikiTitle(hero.wiki_page || hero.name);
        hero.fandom_image = originals[t] || thumbs[t] || '';
    }
}
