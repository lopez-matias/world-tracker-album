'use strict';

const $ = id => document.getElementById(id);

function togglePw(inputId, btn) {
  const input = $(inputId);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.style.opacity = show ? '0.9' : '0.6';
}
window.togglePw = togglePw;

function showMsg(id, msg, isError) {
  const el = $(id);
  el.textContent = msg;
  el.className = isError ? 'form-error' : 'form-success';
}
function hideMsg(...ids) {
  ids.forEach(id => {
    const el = $(id);
    el.textContent = '';
    el.classList.add('hidden');
  });
}

async function api(path, method, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Error desconocido');
  return data;
}

async function loadUser() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) {
    location.href = '/';
    return null;
  }
  return res.json();
}

async function loadStats() {
  const res = await fetch('/api/stickers/progress', { credentials: 'same-origin' });
  if (!res.ok) return;
  const data = await res.json();
  const percentage = data.total ? (data.collected / data.total * 100) : 0;
  $('statCollected').textContent = `${data.collected}/${data.total}`;
  $('statPercent').textContent = `${percentage.toFixed(1)}%`;
  $('statCountries').textContent = data.by_country.filter(country => country.collected === country.total && country.total > 0).length;
  $('statProgressFill').style.width = `${percentage}%`;
}

const usernameBtn = $('usernameForm').querySelector('button[type="submit"]');
usernameBtn.dataset.label = usernameBtn.textContent;
$('usernameForm').addEventListener('submit', async event => {
  event.preventDefault();
  hideMsg('usernameMessage', 'usernameError');
  const username = $('newUsername').value.trim();
  if (!username) return showMsg('usernameError', 'Ingresá un nombre de usuario.', true);
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

const passwordBtn = $('passwordForm').querySelector('button[type="submit"]');
passwordBtn.dataset.label = passwordBtn.textContent;
$('passwordForm').addEventListener('submit', async event => {
  event.preventDefault();
  hideMsg('passwordMessage', 'passwordError');
  const current_password = $('currentPw').value;
  const new_password = $('newPw').value;
  if (!current_password || !new_password) return showMsg('passwordError', 'Completá todos los campos.', true);
  if (new_password.length < 8) return showMsg('passwordError', 'La nueva contraseña debe tener al menos 8 caracteres.', true);
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
});

$('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', 'POST');
  location.href = '/';
});

(async function init() {
  const user = await loadUser();
  if (!user) return;
  $('newUsername').value = user.username;
  await loadStats();
})();
