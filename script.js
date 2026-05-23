// Простая авторизация без Supabase
const USERS_KEY = 'ballisticys_users';
let currentUser = null;

// Элементы
const openAuthBtn = document.getElementById('open-auth-modal');
const profileRoot = document.getElementById('profile-root');
const profileTrigger = document.getElementById('profile-trigger');
const profileMenu = document.getElementById('profile-menu');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const profileInitial = document.getElementById('profile-initial');
const adminPanelLink = document.getElementById('admin-panel-link');
const profileLogoutBtn = document.getElementById('profile-logout-menu-btn');

// Модалки
const authChoiceModal = document.getElementById('auth-choice-modal');
const authLoginModal = document.getElementById('auth-login-modal');
const authSignupModal = document.getElementById('auth-signup-modal');
const adminModal = document.getElementById('admin-modal');

// Кнопки модалок
document.getElementById('close-auth-choice')?.addEventListener('click', () => closeAuth());
document.getElementById('close-auth-login')?.addEventListener('click', () => closeAuth());
document.getElementById('close-auth-signup')?.addEventListener('click', () => closeAuth());
document.getElementById('close-admin')?.addEventListener('click', () => closeAdmin());

document.getElementById('go-to-login-btn')?.addEventListener('click', () => {
  authChoiceModal.classList.add('hidden');
  authLoginModal.classList.remove('hidden');
});

document.getElementById('go-to-signup-btn')?.addEventListener('click', () => {
  authChoiceModal.classList.add('hidden');
  authSignupModal.classList.remove('hidden');
});

document.getElementById('switch-to-signup')?.addEventListener('click', () => {
  authLoginModal.classList.add('hidden');
  authSignupModal.classList.remove('hidden');
});

document.getElementById('switch-to-login')?.addEventListener('click', () => {
  authSignupModal.classList.add('hidden');
  authLoginModal.classList.remove('hidden');
});

// Вход
document.getElementById('login-submit-btn')?.addEventListener('click', () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const status = document.getElementById('login-status');
  
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  const user = users[email];
  
  if (user && user.password === password) {
    currentUser = user;
    localStorage.setItem('ballisticys_session', email);
    status.textContent = 'Успешно!';
    status.style.color = '#4ade80';
    authLoginModal.classList.add('hidden');
    updateUI();
  } else {
    status.textContent = 'Неверный email или пароль';
    status.style.color = '#ff7b72';
  }
});

// Регистрация
document.getElementById('signup-submit-btn')?.addEventListener('click', () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-password-confirm').value;
  const status = document.getElementById('signup-status');
  
  if (password !== confirm) {
    status.textContent = 'Пароли не совпадают';
    status.style.color = '#ff7b72';
    return;
  }
  
  if (password.length < 8) {
    status.textContent = 'Минимум 8 символов';
    status.style.color = '#ff7b72';
    return;
  }
  
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  
  if (users[email]) {
    status.textContent = 'Email уже занят';
    status.style.color = '#ff7b72';
    return;
  }
  
  // Первый пользователь = админ
  const role = Object.keys(users).length === 0 ? 'admin' : 'user';
  
  users[email] = { email, password, role };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  status.textContent = '✅ Успешно! Теперь войдите.';
  status.style.color = '#4ade80';
  
  setTimeout(() => {
    authSignupModal.classList.add('hidden');
    authLoginModal.classList.remove('hidden');
    document.getElementById('login-email').value = email;
  }, 1500);
});

// ЛогOUT
profileLogoutBtn?.addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('ballisticys_session');
  updateUI();
  profileMenu.classList.add('hidden');
});

// Меню профиля
profileTrigger?.addEventListener('click', () => {
  profileMenu.classList.toggle('hidden');
});

// Обновление UI
function updateUI() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  const sessionEmail = localStorage.getItem('ballisticys_session');
  currentUser = users[sessionEmail] || null;
  
  if (currentUser) {
    openAuthBtn.classList.add('hidden');
    profileRoot.classList.remove('hidden');
    profileEmail.textContent = currentUser.email;
    profileRole.textContent = currentUser.role;
    profileInitial.textContent = currentUser.email[0].toUpperCase();
    adminPanelLink.classList.toggle('hidden', currentUser.role !== 'admin');
  } else {
    openAuthBtn.classList.remove('hidden');
    profileRoot.classList.add('hidden');
  }
}

// Проверка сессии при загрузке
updateUI();

function closeAuth() {
  authChoiceModal.classList.add('hidden');
  authLoginModal.classList.add('hidden');
  authSignupModal.classList.add('hidden');
}

function closeAdmin() {
  adminModal.classList.add('hidden');
}

// Открыть админ панель если админ
adminPanelLink?.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentUser?.role === 'admin') {
    adminModal.classList.remove('hidden');
    profileMenu.classList.add('hidden');
  }
});