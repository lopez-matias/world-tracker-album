'use strict';

let countries = [];
let currentIndex = parseInt(localStorage.getItem('albumIndex') || '0', 10);
let progress = { total: 0, collected: 0, percentage: 0, by_country: [] };
let isLoading = false;

const STAR_CODES = new Set([
  'ARG17', 'POR12', 'BRA10', 'FRA10', 'EGY10', 'NOR11',
  'KOR12', 'BEL9', 'ENG10', 'URU10', 'SWE13', 'ESP9',
]);

const $ = id => document.getElementById(id);

async function checkAuth() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) {
    location.href = '/';
    return null;
  }
  return res.json();
}

async function fetchProgress() {
  const res = await fetch('/api/stickers/progress', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo cargar el progreso.');
  progress = await res.json();
  countries = progress.by_country;
  if (currentIndex >= countries.length) currentIndex = 0;
  renderGlobalProgress();
  renderNavDots();
}

async function fetchCountry(code) {
  const res = await fetch(`/api/stickers/${code}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo cargar el país.');
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

function renderGlobalProgress() {
  const pct = progress.total ? (progress.collected / progress.total * 100) : 0;
  $('globalProgressFill').style.width = `${pct}%`;
  $('globalProgressText').textContent = `${progress.collected} / ${progress.total} · ${pct.toFixed(1)}%`;
}

function renderNavDots() {
  const container = $('navDots');
  container.innerHTML = '';
  countries.forEach((country, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'nav-dot';
    if (index === currentIndex) dot.classList.add('active');
    else if (country.collected === country.total) dot.classList.add('complete');
    dot.title = country.name;
    dot.setAttribute('aria-label', `Ir a ${country.name}`);
    dot.addEventListener('click', () => navigateTo(index));
    container.appendChild(dot);
  });
}

function updateNavPosition() {
  $('navPosition').textContent = countries.length ? `${currentIndex + 1} / ${countries.length}` : '0 / 0';
  $('prevBtn').disabled = currentIndex <= 0 || isLoading;
  $('nextBtn').disabled = currentIndex >= countries.length - 1 || isLoading;
}

function paintCountryBackground(countryData) {
  const colors = countryData.flag_colors?.length ? countryData.flag_colors : ['#6366f1', '#22c55e'];
  $('countryBg').style.background = `radial-gradient(circle at 30% 25%, ${colors[0]}, transparent 34%), radial-gradient(circle at 75% 75%, ${colors[1] || colors[0]}, transparent 36%)`;
  $('flagBg').style.background = `linear-gradient(135deg, ${colors.join(', ')})`;
}

function renderCountryHeader(countryData) {
  const pct = countryData.total ? (countryData.collected / countryData.total * 100) : 0;
  $('countryFlagEmoji').textContent = countryData.flag_emoji;
  $('countryName').textContent = countryData.name;
  $('countryProgressFill').style.width = `${pct}%`;
  $('countryProgressText').textContent = `${countryData.collected}/${countryData.total}`;
  paintCountryBackground(countryData);
}

function renderStickers(countryData) {
  const grid = $('stickerGrid');
  grid.innerHTML = '';
  grid.classList.remove('fade-enter');
  void grid.offsetWidth;
  grid.classList.add('fade-enter');

  countryData.stickers.forEach(sticker => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `sticker-item${sticker.has_it ? ' has-it' : ''}`;
    item.dataset.code = sticker.code;
    item.setAttribute('aria-pressed', String(sticker.has_it));

    const circle = document.createElement('div');
    circle.className = `sticker-circle${sticker.has_it ? ' collected' : ''}`;
    circle.innerHTML = sticker.has_it ? '<span class="sticker-check">✓</span>' : '';

    const code = document.createElement('div');
    code.className = 'sticker-code';
    code.textContent = sticker.code;

    const label = document.createElement('div');
    label.className = 'sticker-label';
    label.textContent = sticker.label;

    if (STAR_CODES.has(sticker.code) || sticker.type === 'star') {
      const star = document.createElement('span');
      star.className = 'sticker-star';
      star.textContent = '★';
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
    renderNavDots();
  } catch (err) {
    alert(err.message);
  } finally {
    isLoading = false;
    updateNavPosition();
  }
}

function navigateTo(index) {
  if (index === currentIndex) return;
  loadCountry(index);
}

$('prevBtn').addEventListener('click', () => navigateTo(currentIndex - 1));
$('nextBtn').addEventListener('click', () => navigateTo(currentIndex + 1));
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') navigateTo(currentIndex - 1);
  if (event.key === 'ArrowRight') navigateTo(currentIndex + 1);
});

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
