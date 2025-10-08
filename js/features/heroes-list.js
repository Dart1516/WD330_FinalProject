// js/features/heroes-list.js
// All comments in English.

import { getAllHeroes, DataConfig } from './heroes-data.js';

/* =========================================================
   1) DOM & STATE
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

const state = {
    all: /** @type {import('./heroes-data.js').Hero[]} */([]),
    list: [],
    roles: new Set(),      // OR within group
    universes: new Set(),  // OR within group
    text: '',              // AND with groups
};

const IS_TOUCH = matchMedia('(hover: none)').matches;

/* =========================================================
   2) START
   ========================================================= */
boot().catch(showError);

async function boot() {
    renderSkeletons(8);
    bindFilterChips();   // now reads from #emblem-bar .emblem
    bindSearch();
    bindClear();
    bindSheet();

    try {
        state.all = await getAllHeroes();
    } catch (e) {
        showError(e);
        return;
    }
    applyFilters();
    updateCount(state.list.length);
}

/* =========================================================
   3) EVENTS
   ========================================================= */
// Maps new emblem classes -> filter tokens used by data
const ROLE_BY_CLASS = {
    'role-tank': 'Tank',
    'role-warrior': 'Bruiser',
    'role-ass-melee': 'Melee Assassin',
    'role-ass-range': 'Ranged Assassin',
    'role-healer': 'Healer',
    'role-support': 'Support',
};

const UNIVERSE_BY_CLASS = {
    'uni-warcraft': 'Warcraft',
    'uni-starcraft': 'StarCraft',
    'uni-diablo': 'Diablo',
    'uni-overwatch': 'Overwatch',
    'uni-nexus': 'Nexus',
};

function bindFilterChips() {
    // Switch from button.icon-chip to #emblem-bar .emblem with event delegation
    if (!$.emblemBar) return;

    const handleToggle = (item) => {
        if (!item || !item.classList.contains('emblem')) return;

        const roleToken = getRoleToken(item);
        const uniToken = getUniverseToken(item);

        if (roleToken) toggle(item, state.roles, roleToken);
        if (uniToken) toggle(item, state.universes, uniToken);

        // Sync visual class with aria-pressed
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

        // Clear emblem selections (instead of old .icon-chip)
        if ($.emblemBar) {
            $.emblemBar.querySelectorAll('.emblem').forEach((el) => {
                el.setAttribute('aria-pressed', 'false');
                el.classList.remove('active');
            });
        }

        applyFilters();
    });
}

function toggle(btn, set, value) {
    // Keeps same API but now works with <li.emblem>
    if (set.has(value)) {
        set.delete(value);
        btn.setAttribute('aria-pressed', 'false');
    } else {
        set.add(value);
        btn.setAttribute('aria-pressed', 'true');
    }
}

/* =========================================================
   4) FILTER + RENDER
   ========================================================= */
function applyFilters() {
    const q = state.text.toLowerCase();

    state.list = state.all.filter((h) => {
        // text
        if (q) {
            const hay = `${h.name} ${h.alt_name ?? ''} ${h.short_name ?? ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        // roles (OR). If hero role is "Assassin", accept if user selected Melee or Ranged.
        if (state.roles.size) {
            const heroRole = h.new_role || h.role;
            const roleOk =
                state.roles.has(heroRole) ||
                (heroRole === 'Assassin' && (state.roles.has('Melee Assassin') || state.roles.has('Ranged Assassin')));
            if (!roleOk) return false;
        }
        // universe (OR)
        if (state.universes.size && !state.universes.has(h.universe)) return false;
        return true;
    });

    renderGrid(state.list);
    renderActiveChips();
    updateCount(state.list.length);
}

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
        card.setAttribute('role', 'gridcell');
        card.setAttribute('aria-label', `${hero.name}. Quick view`);

        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = hero.portrait;
        img.srcset = `${hero.portrait} 1x`;
        img.sizes = '(max-width: 720px) 50vw, 25vw';
        card.append(img);

        if (IS_TOUCH) {
            card.addEventListener('click', () => openSheet(hero));
        } else {
            attachPopover(card, hero);
            card.addEventListener('click', () => goToDetails(hero.id));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToDetails(hero.id);
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
    if (state.text) chips.push(`Texto: “${state.text}”`);
    if (state.roles.size) chips.push(...[...state.roles].map(r => `Rol: ${r}`));
    if (state.universes.size) chips.push(...[...state.universes].map(u => `Universo: ${u}`));
    $.chipsWrap.innerHTML = chips.map(t => `<span class="chip">${t}</span>`).join('');
}

function updateCount(n) {
    if ($.count) $.count.textContent = String(n);
}

function showError(err) {
    console.error(err);
    $.grid.innerHTML = '';
    if ($.tplError) $.grid.append($.tplError.content.cloneNode(true));
}

/* =========================================================
   5) NAV
   ========================================================= */
function goToDetails(id) {
    const url = DataConfig.joinPublic(`/pages/heroes-details.html?id=${encodeURIComponent(id)}`);
    window.location.assign(url);
}

/* =========================================================
   6) DESKTOP POPOVER
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
   7) MOBILE SHEET
   ========================================================= */
function bindSheet() {
    if (!$.sheet) return;
    const close = () => $.sheet.open && $.sheet.close();
    $.sheet.querySelector('.sheet-close')?.addEventListener('click', close);
    $.sheet.addEventListener('click', (e) => { if (e.target === $.sheet) close(); });
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

function openSheet(hero) {
    if (!$.sheet) return;
    const body = $.sheet.querySelector('.sheet-body');
    body.innerHTML = `
    <div style="display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:start;">
      <img src="${hero.portrait}" alt="" loading="lazy" decoding="async"
           style="width:100%;border-radius:10px;aspect-ratio:4/5;object-fit:cover;border:1px solid var(--border-color-light);" />
      <div>
        <h3 style="margin:0 0 6px 0;">${escapeHTML(hero.name)}</h3>
        <p style="margin:0 0 6px 0; color:var(--color-text-muted); font-size:13px;">
          ${iconRole(hero.new_role || hero.role)} ${escapeHTML(hero.new_role || hero.role)} &nbsp;•&nbsp;
          ${iconUniverse(hero.universe)} ${escapeHTML(hero.universe)}
        </p>
        ${hero.description_short ? `<p style="margin:0 0 10px 0;">${escapeHTML(hero.description_short)}</p>` : ''}
        <button class="btn-clear" data-nav="${encodeURIComponent(hero.id)}">Ver detalles</button>
      </div>
    </div>`;
    body.querySelector('button[data-nav]')?.addEventListener('click', (e) => {
        const id = /** @type {HTMLElement} */(e.currentTarget).dataset.nav;
        goToDetails(id);
    });
    $.sheet.showModal();
}

/* =========================================================
   8) ICONS & UTILS
   ========================================================= */
function iconRole(role) {
    // Updated to new PNG asset names
    const map = {
        Tank: DataConfig.joinPublic('/assets/icons/roles/01_tank-removebg-preview.png'),
        Bruiser: DataConfig.joinPublic('/assets/icons/roles/02_guerrero-removebg-preview.png'),
        'Melee Assassin': DataConfig.joinPublic('/assets/icons/roles/04_mele-removebg-preview.png'), // file is "mele"
        'Ranged Assassin': DataConfig.joinPublic('/assets/icons/roles/03_distancia-removebg-preview.png'),
        Healer: DataConfig.joinPublic('/assets/icons/roles/05_sanador-removebg-preview.png'),
        Support: DataConfig.joinPublic('/assets/icons/roles/06_apoyo-removebg-preview.png'),
    };
    const src = map[role] || map['Melee Assassin']; // safe fallback
    return `<img src="${src}" alt="" aria-hidden="true" style="width:14px;height:14px;vertical-align:-2px;filter:brightness(1.1)">`;
}

function iconUniverse(u) {
    const map = {
        Warcraft: DataConfig.joinPublic('/assets/icons/universes/07_warcraft-removebg-preview.png'),
        Diablo: DataConfig.joinPublic('/assets/icons/universes/09_diablo-removebg-preview.png'),
        StarCraft: DataConfig.joinPublic('/assets/icons/universes/08_starcraft-removebg-preview.png'),
        Overwatch: DataConfig.joinPublic('/assets/icons/universes/10_overwatch-removebg-preview.png'),
        Nexus: DataConfig.joinPublic('/assets/icons/universes/11_nexo-removebg-preview.png'),
    };
    const src = map[u] || map.Nexus;
    return `<img src="${src}" alt="" aria-hidden="true" style="width:14px;height:14px;vertical-align:-2px;filter:brightness(1.1)">`;
}

function escapeHTML(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
