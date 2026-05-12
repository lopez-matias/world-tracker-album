'use strict';

const $ = id => document.getElementById(id);

function togglePw(inputId, btn) {
  const input = $(inputId);
  if (input.type === 'password') { input.type = 'text'; btn.style.opacity = '0.9'; }
  else { input.type = 'password'; btn.style.opacity = '0.5'; }
}
window.togglePw = togglePw;

function showMsg(id, msg, isError) {
  const el = $(id);
  el.textContent = msg;
  el.className = isError ? 'form-error' : 'form-success';
}
function hideMsg(...ids) { ids.forEach(id => $(id).classList.add('hidden')); }

async function api(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Error desconocido');
  return data;
}

// ── Auth guard + load user ────────────────────────────────────────────────────
async function loadUser() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) { location.href = '/'; return null; }
  return res.json();
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  const res = await fetch('/api/stickers/progress', { credentials: 'same-origin' });
  if (!res.ok) return;
  const data = await res.json();
  $('statCollected').textContent = `${data.collected}/${data.total}`;
  $('statPercent').textContent = `${data.percentage}%`;
  const complete = data.by_country.filter(c => c.collected === c.total && c.total > 0).length;
  $('statCountries').textContent = complete;
  $('statProgressFill').style.width = data.percentage + '%';
}

// ── Username form ─────────────────────────────────────────────────────────────
const usernameBtn = $('usernameForm').querySelector('button[type="submit"]');
usernameBtn.dataset.label = usernameBtn.textContent;

$('usernameForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideMsg('usernameMessage', 'usernameError');
  const username = $('newUsername').value.trim();
  if (!username) { showMsg('usernameError', 'Ingresá un nombre de usuario.', true); return; }
  usernameBtn.disabled = true;
  usernameBtn.textContent = 'Guardando...';
  try {
    const data = await api('/api/users/profile', 'PATCH', { username });
    showMsg('usernameMessage', `Usuario actualizado a "${data.username}"`, false);
  } catch (err) {
    showMsg('usernameError', err.message, true);
  } finally {
    usernameBtn.disabled = false;
    usernameBtn.textContent = usernameBtn.dataset.label;
  }
});

// ── Password form ─────────────────────────────────────────────────────────────
const passwordBtn = $('passwordForm').querySelector('button[type="submit"]');
passwordBtn.dataset.label = passwordBtn.textContent;

$('passwordForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideMsg('passwordMessage', 'passwordError');
  const current_password = $('currentPw').value;
  const new_password = $('newPw').value;
  if (!current_password || !new_password) {
    showMsg('passwordError', 'Completá todos los campos.', true);
    return;
  }
  if (new_password.length < 8) {
    showMsg('passwordError', 'La nueva contraseña debe tener al menos 8 caracteres.', true);
    return;
  }
  passwordBtn.disabled = true;
  passwordBtn.textContent = 'Guardando...';
  try {
    await api('/api/users/password', 'PATCH', { current_password, new_password });
    showMsg('passwordMessage', 'Contraseña actualizada correctamente.', false);
    $('passwordForm').reset();
  } catch (err) {
    showMsg('passwordError', err.message, true);
  } finally {
    passwordBtn.disabled = false;
    passwordBtn.textContent = passwordBtn.dataset.label;
  }