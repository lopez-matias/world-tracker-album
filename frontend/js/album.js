'use strict';

let countries = [];
let currentIndex = parseInt(localStorage.getItem('albumIndex') || '0', 10);
let progress = { total: 0, collected: 0, percentage: 0, by_country: [] };
let isLoading = false;

// Posiciones con figurita especial/brillante por equipo
const STAR_CODES = new Set([
  'ARG17', 'POR12', 'BRA10', 'FRA10', 'EGY10', 'NOR11',
  'KOR12', 'BEL09', 'ENG10', 'URU10', 'SWE17', 'ESP09',
]);

const SVG_CHECK = '<svg class="sticker-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
const SVG_STAR  = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

const $ = id => document.getElementById(id);

// ── Auth ──────────────────────────────────────────────────────────────────────
async function checkAuth() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) { location.href = '/'; return null; }
  return res.json();
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchProgress() {
  const res = await fetch('/api/stickers/progress', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo cargar el progreso.');
  progress = await res.json();
  countries = progress.by_country;
  if (currentIndex >= countries.length) currentIndex = 0;
  renderGlobalProgress();
}

async function fetchCountry(code) {
  const res = await fetch(`/api/stickers/${code}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo cargar el pais.');
  return res.json();
}

async function toggleSticker(stickerCode) {
  const res = await fetch('/api/stickers/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sticker_code: stickerCode }),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar la figurita.');
  return data.has_it;
}

// ── Render: header y progreso global ─────────────────────────────────────────
function renderGlobalProgress() {
  const pct = progress.total ? (progress.collected / progress.total * 100) : 0;
  $('globalProgressFill').style.width = `${pct}%`;
  $('globalProgressText').textContent = `${progress.collected} / ${progress.total} · ${pct.toFixed(1)}%`;
}

function updateNavPosition() {
  $('navPosition').textContent = countries.length
    ? `${currentIndex + 1} / ${countries.length}`
    : '0 / 0';
  $('prevBtn').disabled = currentIndex <= 0 || isLoading;
  $('nextBtn').disabled = currentIndex >= countries.length - 1 || isLoading;
}

// ── Render: país ──────────────────────────────────────────────────────────────
function paintBackground(countryData) {
  const colors = countryData.flag_colors?.length
    ? countryData.flag_colors
    : ['#6366f1', '#22c55e'];
  const c1 = colors[0], c2 = colors[1] || colors[0], c3 = colors[2] || c2;
  $('countryBg').style.background = [
    `radial-gradient(ellipse at 15% 20%, ${c1}cc, transparent 45%)`,
    `radial-gradient(ellipse at 85% 80%, ${c2}99, transparent 45%)`,
    `radial-gradient(ellipse at 50% 110%, ${c3}66, transparent 40%)`,
  ].join(', ');
  $('flagBg').style.background =
    `linear-gradient(135deg, ${c1}22 0%, ${c2}11 50%, ${c3}22 100%)`;
}

function renderCountryHeader(countryData) {
  const pct = countryData.total ? (countryData.collected / countryData.total * 100) : 0;
  $('countryFlagEmoji').textContent = countryData.flag_emoji;
  $('countryName').textContent = countryData.name;
  const badge = $('countryGroupBadge');
  if (countryData.group) {
    badge.textContent = `Grupo ${countryData.group}`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
  $('countryProgressFill').style.width = `${pct}%`;
  $('countryProgressText').textContent = `${countryData.collected}/${countryData.total}`;
  paintBackground(countryData);
}

// ── Render: figuritas ─────────────────────────────────────────────────────────
function renderStickers(countryData) {
  const grid = $('stickerGrid');
  grid.innerHTML = '';
  grid.classList.remove('fade-enter');
  void grid.offsetWidth;
  grid.classList.add('fade-enter');

  const isSpecial = countryData.stickers.every(s => s.type === 'special');

  countryData.stickers.forEach(sticker => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `sticker-item${sticker.has_it ? ' has-it' : ''}${sticker.type === 'group' ? ' is-group' : ''}${sticker.type === 'special' ? ' is-special' : ''}`;
    item.dataset.code = sticker.code;
    item.setAttribute('aria-pressed', String(sticker.has_it));

    const circle = document.createElement('div');
    circle.className = `sticker-circle${sticker.has_it ? ' collected' : ''}`;
    circle.innerHTML = sticker.has_it ? SVG_CHECK : '';

    const code = document.createElement('div');
    code.className = 'sticker-code';
    code.textContent = sticker.code;

    const label = document.createElement('div');
    label.className = 'sticker-label';
    label.textContent = sticker.label;

    if (STAR_CODES.has(sticker.code) || sticker.type === 'star') {
      const star = document.createElement('span');
      star.className = 'sticker-star';
      star.innerHTML = SVG_STAR;
      item.appendChild(star);
    }

    item.append(circle, code, label);
    item.addEventListener('click', async () => {
      item.disabled = true;
      try {
        const hasIt = await toggleSticker(sticker.code);
        sticker.has_it = hasIt;
        await loadCountry(currentIndex, { refreshProgress: true });
      } catch (err) {
        alert(err.message);
      } finally {
        item.disabled = false;
      }
    });
    grid.appendChild(item);
  });
}

// ── Carga de país ─────────────────────────────────────────────────────────────
async function loadCountry(index, options = {}) {
  if (!countries.length || isLoading) return;
  isLoading = true;
  updateNavPosition();
  try {
    currentIndex = Math.max(0, Math.min(index, countries.length - 1));
    localStorage.setItem('albumIndex', String(currentIndex));
    const countryData = await fetchCountry(countries[currentIndex].code);
    renderCountryHeader(countryData);
    renderStickers(countryData);
    if (options.refreshProgress) await fetchProgress();
  } catch (err) {
    alert(err.message);
  } finally {
    isLoading = false;
    updateNavPosition();
  }
}

function navigateTo(index) {
  if (index === currentIndex || isLoading) return;
  loadCountry(index);
}

// ── Buscador ──────────────────────────────────────────────────────────────────
let allStickersCache = null;

function openSearch() {
  $('searchOverlay').classList.add('active');
  $('searchInput').focus();
  if (!allStickersCache) buildSearchCache();
}
function closeSearch() {
  $('searchOverlay').classList.remove('active');
  $('searchInput').value = '';
  $('searchResults').innerHTML = '';
}

function buildSearchCache() {
  allStickersCache = [];
  countries.forEach(country => {
    // Usamos el progreso ya cargado para encontrar el código
    allStickersCache.push({ type: 'country', code: country.code, name: country.name, index: countries.indexOf(country) });
  });
}

async function runSearch(query) {
  const q = query.trim().toLowerCase();
  const container = $('searchResults');
  if (!q) { container.innerHTML = ''; return; }

  // Buscar países por nombre
  const countryMatches = countries
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));

  if (countryMatches.length === 0) {
    container.innerHTML = '<p class="search-empty">Sin resultados</p>';
    return;
  }

  container.innerHTML = '';
  for (const country of countryMatches.slice(0, 8)) {
    let countryData;
    try { countryData = await fetchCountry(country.code); } catch { continue; }

    const stickerMatches = countryData.stickers.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      country.name.toLowerCase().includes(q)
    );
    if (!stickerMatches.length) continue;

    const section = document.createElement('div');
    section.className = 'search-section';

    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.textContent = `${country.name}`;

    const btn = document.createElement('button');
    btn.className = 'search-go';
    btn.textContent = 'Ver';
    btn.addEventListener('click', () => {
      closeSearch();
      navigateTo(country.index);
    });
    title.appendChild(btn);

    const grid = document.createElement('div');
    grid.className = 'search-grid';

    stickerMatches.forEach(s => {
      const chip = document.createElement('div');
      chip.className = `search-chip${s.has_it ? ' has-it' : ''}`;
      chip.textContent = `${s.code} · ${s.label}`;
      grid.appendChild(chip);
    });

    section.append(title, grid);
    container.appendChild(section);
  }

  if (!container.children.length) {
    container.innerHTML = '<p class="search-empty">Sin resultados para esa figurita</p>';
  }
}

// ── Eventos ───────────────────────────────────────────────────────────────────
$('prevBtn').addEventListener('click', () => navigateTo(currentIndex - 1));
$('nextBtn').addEventListener('click', () => navigateTo(currentIndex + 1));
$('searchBtn').addEventListener('click', openSearch);
$('searchClose').addEventListener('click', closeSearch);

let searchTimer;
$('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(e.target.value), 300);
});

$('searchOverlay').addEventListener('click', e => {
  if (e.target === $('searchOverlay')) closeSearch();
});

document.addEventListener('keydown', event => {
  if ($('searchOverlay').classList.contains('active')) {
    if (event.key === 'Escape') closeSearch();
    return;
  }
  if (event.key === 'ArrowLeft')  navigateTo(currentIndex - 1);
  if (event.key === 'ArrowRight') navigateTo(currentIndex + 1);
});

// Swipe táctil
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  if ($('searchOverlay').classList.contains('active')) return;
  const delta = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(delta) < 60) return;
  if (delta > 0) navigateTo(currentIndex + 1);
  else navigateTo(currentIndex - 1);
}, { passive: true });

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  const user = await checkAuth();
  if (!user) return;
  $('headerUsername').textContent = user.username;
  try {
    await fetchProgress();
    await loadCountry(currentIndex);
  } catch (err) {
    alert(err.message);
  }
})();
