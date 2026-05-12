'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let countries = [];
let currentIndex = parseInt(localStorage.getItem('albumIndex') || '0', 10);
let progress = { total: 980, collected: 0, by_country: [] };
let isLoading = false;

// ── Auth guard ────────────────────────────────────────────────────────────────
async function checkAuth() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) { location.href = '/'; return null; }
  return res.json();
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchProgress() {
  const res = await fetch('/api/stickers/progress', { credentials: 'same-origin' });
  if (!res.ok) return;
  progress = await res.json();
  countries = progress.by_country;
  renderGlobalProgress();
  renderNavDots();
}

async function fetchCountry(code) {
  const res = await fetch(`/api/stickers/${code}`, { credentials: 'same-origin' });
  if (!res.ok) return null;
  return res.json();
}

async function toggleSticker(stickerCode, itemEl) {
  const res = await fetch('/api/stickers/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sticker_code: stickerCode }),
    credentials: 'same-origin',
  });
  if (!res.ok) return;
  const data = await res.json();
  return data.has_it;
}

// ── Render helpers ────────────────────────────────────────────────────────────
function renderGlobalProgress() {
  const pct = progress.total ? (progress.collected / progress.total * 100) : 0;
  document.getElementById('globalProgressFill').style.width = pct + '%';
  document.getElementById('globalProgressText').textContent =
    `${progress.collected} / ${progress.total} · ${pct.toFixed(1)}%`;
}

function renderNavDots() {
  const container = document.getElementById('navDots');
  container.innerHTML = '';
  countries.forEach((c, i) => {
    const dot = document.createElement('div');
    dot.className = 'nav-dot';
    if (i === currentIndex) dot.classList.add('active');
    else if (c.collected === c.total) dot.classList.add('complete');
    dot.title = c.name;
    dot.addEventListener('click', () => navigateTo(i));
    container.appendChild(dot);
  });
}

function updateNavPosition() {
  document.getElementById('navPosition').textContent = `${currentIndex + 1} / ${countries.length}`;
  document.getElementById('prevBtn').disabled = currentIndex === 0;
  document.getElementById('nextBtn').disabled = currentIndex === countries.length - 1;
}

// Star stickers (famous players): Messi, Ronaldo, Neymar, Mbappé, etc.
const STAR_CODES = new Set([
  'ARG17', 'POR12', 'BRA10', 'FRA10', 'EGY10', 'NOR11',
  'KOR12', 'BEL9', 'ENG10', 'URU10', 'SWE13', 'ESP9',
]);

function renderStickers(countryData) {
  const grid = document.getElementById('stickerGrid');
  grid.innerHTML = '';
  grid.classList.add('fade-enter');

  let collected = 0;
  countryData.stickers.forEach(s => {
    if (s.has_it) collected++;

    const item = document.createElement('div');
    item.className = 'sticker-item' + (s.has_it ? ' has-it' : '');
    item.dataset.code = s.code;

    const circle = document.createElement('div');
    circle.className = 'sticker-circle';
    if (s.has_it) { circle.classList.add('collected'); circle.innerHTML = '<span class="sticker-check">✓</span>'; }

    const code = document.createElement('div');
    code.className = 'sticker-code';
    code.textContent = s.code;

    const label = document.createElement('div');
    label.className = 'sticker-label';