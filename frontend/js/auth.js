'use strict';

const $ = id => document.getElementById(id);

// ── Form switching ──────────────────────────────────────────────────────────
function showForm(id) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  $(id).classList.add('active');
}

$('toRegister').addEventListener('click', e => { e.preventDefault(); showForm('registerForm'); });
$('toLogin').addEventListener('click', e => { e.preventDefault(); showForm('loginForm'); });
$('forgotLink').addEventListener('click', e => { e.preventDefault(); showForm('forgotForm'); });
$('backToLogin').addEventListener('click', e => { e.preventDefault(); showForm('loginForm'); });

// Check for reset token in URL
const resetToken = new URLSearchParams(location.search).get('token');
if (resetToken) showForm('resetForm');

// ── Helpers ─────────────────────────────────────────────────────────────────
function setError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearMsg(...ids) {
  ids.forEach(id => $(id).classList.add('hidden'));
}
function setSuccess(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Cargando...' : btn.dataset.label;
}

function togglePw(inputId, btn) {
  const input = $(inputId);
  if (input.type === 'password') { input.type = 'text'; btn.style.opacity = '0.9'; }
  else { input.type = 'password'; btn.style.opacity = '0.5'; }
}
window.togglePw = togglePw;

async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Error desconocido');
  return data;
}

// ── Login ────────────────────────────────────────────────────────────────────
const loginBtn = $('loginForm').querySelector('button[type="submit"]');
loginBtn.dataset.label = loginBtn.textContent;

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg('loginError');
  const login = $('loginInput').value.trim();
  const password = $('loginPassword').value;
  const remember_me = $('rememberMe').checked;
  if (!login || !password) return setError('loginError', 'Completá todos los campos.');
  setLoading(loginBtn, true);
  try {
    await api('/api/auth/login', { login, password, remember_me });
    location.href = '/album';
  } catch (err) {
    setError('loginError', err.message);
  } finally { setLoading(loginBtn, false); }
});

// ── Register ─────────────────────────────────────────────────────────────────
const regBtn = $('registerForm').querySelector('button[type="submit"]');
regBtn.dataset.label = regBtn.textContent;

$('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg('registerError');
  const username = $('regUsername').value.trim();
  const email = $('regEmail').value.trim();
  const password = $('regPassword').value;
  if (!username || !email || !password) return setError('registerError', 'Completá todos los campos.');
  setLoading(regBtn, true);
  try {
    await api('/api/auth/register', { username, email, password });
    location.href = '/album';
  } catch (err) {
    setError('registerError', err.message);
  } finally { setLoading(regBtn, false); }
});

// ── Forgot password ──────────────────────────────────────────────────────────
const forgotBtn = $('forgotForm').querySelector('button[type="submit"]');
forgotBtn.dataset.label = forgotBtn.textContent;