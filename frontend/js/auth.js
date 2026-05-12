'use strict';

const $ = id => document.getElementById(id);

function showForm(id) {
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  $(id).classList.add('active');
}

$('toRegister').addEventListener('click', event => { event.preventDefault(); showForm('registerForm'); });
$('toLogin').addEventListener('click', event => { event.preventDefault(); showForm('loginForm'); });
$('forgotLink').addEventListener('click', event => { event.preventDefault(); showForm('forgotForm'); });
$('backToLogin').addEventListener('click', event => { event.preventDefault(); showForm('loginForm'); });

const resetToken = new URLSearchParams(location.search).get('token');
if (resetToken) showForm('resetForm');

function setError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearMsg(...ids) {
  ids.forEach(id => {
    const el = $(id);
    el.textContent = '';
    el.classList.add('hidden');
  });
}
function setSuccess(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function setLoading(btn, loading, text = 'Cargando...') {
  btn.disabled = loading;
  btn.textContent = loading ? text : btn.dataset.label;
}
function togglePw(inputId, btn) {
  const input = $(inputId);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.style.opacity = show ? '0.9' : '0.6';
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

const loginBtn = $('loginForm').querySelector('button[type="submit"]');
loginBtn.dataset.label = loginBtn.textContent;
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
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
  } finally {
    setLoading(loginBtn, false);
  }
});

const regBtn = $('registerForm').querySelector('button[type="submit"]');
regBtn.dataset.label = regBtn.textContent;
$('registerForm').addEventListener('submit', async event => {
  event.preventDefault();
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
  } finally {
    setLoading(regBtn, false);
  }
});

const forgotBtn = $('forgotForm').querySelector('button[type="submit"]');
forgotBtn.dataset.label = forgotBtn.textContent;
$('forgotForm').addEventListener('submit', async event => {
  event.preventDefault();
  clearMsg('forgotMessage', 'forgotError');
  const email = $('forgotEmail').value.trim();
  if (!email) return setError('forgotError', 'Ingresá tu email.');
  setLoading(forgotBtn, true, 'Enviando...');
  try {
    await api('/api/auth/forgot-password', { email });
    setSuccess('forgotMessage', 'Si el email existe, te enviamos un link de recuperación.');
  } catch (err) {
    setError('forgotError', err.message);
  } finally {
    setLoading(forgotBtn, false);
  }
});

const resetBtn = $('resetForm').querySelector('button[type="submit"]');
resetBtn.dataset.label = resetBtn.textContent;
$('resetForm').addEventListener('submit', async event => {
  event.preventDefault();
  clearMsg('resetMessage', 'resetError');
  const new_password = $('resetPassword').value;
  if (new_password.length < 8) return setError('resetError', 'La contraseña debe tener al menos 8 caracteres.');
  setLoading(resetBtn, true, 'Guardando...');
  try {
    await api('/api/auth/reset-password', { token: resetToken, new_password });
    setSuccess('resetMessage', 'Contraseña actualizada. Ya podés iniciar sesión.');
    setTimeout(() => { location.href = '/'; }, 1400);
  } catch (err) {
    setError('resetError', err.message);
  } finally {
    setLoading(resetBtn, false);
  }
});
