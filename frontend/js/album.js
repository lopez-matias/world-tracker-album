'use strict';

let countries = [];
let currentIndex = parseInt(localStorage.getItem('albumIndex') || '0', 10);
let progress = { total: 0, collected: 0, percentage: 0, by_country: [] };
let isLoading = false;
let pendingIndex = null;

// In-memory cache so revisiting a country is instant
const countryCache = new Map();

const SVG_CHECK = '<svg class="sticker-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

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
  if (countryCache.has(code)) return countryCache.get(code);
  const res = await fetch(`/api/stickers/${code}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo cargar el pais.');
  const data = await res.json();
  countryCache.set(code, data);
  return data;
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

    item.append(circle, code, label);

    item.addEventListener('click', async () => {
      const newHasIt = !sticker.has_it;
      const delta = newHasIt ? 1 : -1;

      // Optimistic update — instant visual feedback
      sticker.has_it = newHasIt;
      countryData.collected += delta;
      progress.collected += delta;
      const countryEntry = countries.find(c => c.code === countryData.code);
      if (countryEntry) countryEntry.collected += delta;

      item.classList.toggle('has-it', newHasIt);
      item.setAttribute('aria-pressed', String(newHasIt));
      circle.classList.toggle('collected', newHasIt);
      circle.innerHTML = newHasIt ? SVG_CHECK : '';
      renderCountryHeader(countryData);
      renderGlobalProgress();

      if (newHasIt && countryData.collected === countryData.total) launchConfetti();

      item.disabled = true;
      try {
        const confirmedHasIt = await toggleSticker(sticker.code);
        // If server disagrees (e.g. race condition), reconcile
        if (confirmedHasIt !== newHasIt) {
          const fix = confirmedHasIt ? 1 : -1;
          sticker.has_it = confirmedHasIt;
          countryData.collected += fix - delta;
          progress.collected += fix - delta;
          if (countryEntry) countryEntry.collected += fix - delta;
          item.classList.toggle('has-it', confirmedHasIt);
          item.setAttribute('aria-pressed', String(confirmedHasIt));
          circle.classList.toggle('collected', confirmedHasIt);
          circle.innerHTML = confirmedHasIt ? SVG_CHECK : '';
          renderCountryHeader(countryData);
          renderGlobalProgress();
        }
      } catch (err) {
        // Revert optimistic update
        sticker.has_it = !newHasIt;
        countryData.collected -= delta;
        progress.collected -= delta;
        if (countryEntry) countryEntry.collected -= delta;
        item.classList.toggle('has-it', !newHasIt);
        item.setAttribute('aria-pressed', String(!newHasIt));
        circle.classList.toggle('collected', !newHasIt);
        circle.innerHTML = !newHasIt ? SVG_CHECK : '';
        renderCountryHeader(countryData);
        renderGlobalProgress();
        alert(err.message);
      } finally {
        item.disabled = false;
      }
    });

    grid.appendChild(item);
  });
}

// ── Preload ───────────────────────────────────────────────────────────────────
function preloadAdjacent(index) {
  [index - 1, index + 1].forEach(i => {
    if (i >= 0 && i < countries.length && !countryCache.has(countries[i].code)) {
      fetchCountry(countries[i].code).catch(() => {});
    }
  });
}

// ── Carga de país ─────────────────────────────────────────────────────────────
async function loadCountry(index) {
  if (!countries.length || isLoading) return;
  isLoading = true;
  updateNavPosition();
  try {
    currentIndex = Math.max(0, Math.min(index, countries.length - 1));
    localStorage.setItem('albumIndex', String(currentIndex));
    const countryData = await fetchCountry(countries[currentIndex].code);
    renderCountryHeader(countryData);
    renderStickers(countryData);
    preloadAdjacent(currentIndex);
  } catch (err) {
    alert(err.message);
  } finally {
    isLoading = false;
    updateNavPosition();
    if (pendingIndex !== null) {
      const next = pendingIndex;
      pendingIndex = null;
      navigateTo(next);
    }
  }
}

function navigateTo(index) {
  if (index < 0 || index >= countries.length) return;
  if (index === currentIndex && !isLoading) return;
  if (isLoading) { pendingIndex = index; return; }
  loadCountry(index);
}

// ── Buscador ──────────────────────────────────────────────────────────────────
function openSearch() {
  $('searchOverlay').classList.add('active');
  $('searchInput').focus();
}
function closeSearch() {
  $('searchOverlay').classList.remove('active');
  $('searchInput').value = '';
  $('searchResults').innerHTML = '';
}

async function runSearch(query) {
  const q = query.trim().toLowerCase();
  const container = $('searchResults');
  if (!q) { container.innerHTML = ''; return; }
  container.innerHTML = '';

  const countryMatches = countries
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));

  for (const country of countryMatches.slice(0, 6)) {
    const section = document.createElement('div');
    section.className = 'search-section';
    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.textContent = country.name;
    const btn = document.createElement('button');
    btn.className = 'search-go';
    btn.textContent = 'Ver';
    btn.addEventListener('click', () => { closeSearch(); navigateTo(country.index); });
    title.appendChild(btn);
    section.appendChild(title);
    container.appendChild(section);
  }

  const shownCodes = new Set(countryMatches.map(c => c.code));
  for (const [i, country] of countries.entries()) {
    if (shownCodes.has(country.code)) continue;
    let countryData;
    try { countryData = await fetchCountry(country.code); } catch { continue; }

    const stickerMatches = countryData.stickers.filter(s =>
      s.code.toLowerCase().includes(q) ||
      (s.label && s.label.toLowerCase().includes(q))
    );
    if (!stickerMatches.length) continue;

    const section = document.createElement('div');
    section.className = 'search-section';
    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.textContent = country.name;
    const btn = document.createElement('button');
    btn.className = 'search-go';
    btn.textContent = 'Ver';
    btn.addEventListener('click', () => { closeSearch(); navigateTo(i); });
    title.appendChild(btn);
    const grid = document.createElement('div');
    grid.className = 'search-grid';
    stickerMatches.forEach(s => {
      const chip = document.createElement('div');
      chip.className = `search-chip${s.has_it ? ' has-it' : ''}`;
      chip.textContent = s.label ? `${s.code} · ${s.label}` : s.code;
      grid.appendChild(chip);
    });
    section.append(title, grid);
    container.appendChild(section);
    if (container.children.length >= 8) break;
  }

  if (!container.children.length) {
    container.innerHTML = '<p class="search-empty">Sin resultados</p>';
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

// ── Confetti ──────────────────────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:998;pointer-events:none;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const COLORS = ['#e63946','#f97316','#fbbf24','#4ade80','#06b6d4','#ffffff','#c084fc'];
  const pieces = Array.from({ length: 140 }, () => ({
    x:  Math.random() * canvas.width,
    y: -20 - Math.random() * 240,
    w: 7 + Math.random() * 9,
    h: 3 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 2.5,
    vy: 1.8 + Math.random() * 3.5,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - 0.5) * 0.14,
    wave:  Math.random() * Math.PI * 2,
    opacity: 1,
  }));

  let frame, t = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t++;
    let alive = false;
    for (const p of pieces) {
      p.x += p.vx + Math.sin(t * 0.018 + p.wave) * 0.6;
      p.y += p.vy;
      p.vy = Math.min(p.vy + 0.055, 9);
      p.angle += p.spin;
      if (t > 100) p.opacity -= 0.014;
      if (p.y < canvas.height + 20 && p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
    if (alive) {
      frame = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }

  frame = requestAnimationFrame(draw);
  setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 8000);
}

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
  } finally {
    const splash = $('splash');
    if (splash) {
      splash.classList.add('splash-out');
      setTimeout(() => splash.remove(), 700);
    }
  }
})();
