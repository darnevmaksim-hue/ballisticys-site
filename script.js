// === AUTH SYSTEM (LOCALSTORAGE) ===
const USERS_KEY = 'ballisticys_users_v1';
const SESSION_KEY = 'ballisticys_session';

// Modal elements
const authChoiceModal = document.getElementById('auth-choice-modal');
const authLoginModal = document.getElementById('auth-login-modal');
const authSignupModal = document.getElementById('auth-signup-modal');
const adminModal = document.getElementById('admin-modal');

// Open auth button
const openAuthBtn = document.getElementById('open-auth-modal');
const profileRoot = document.getElementById('profile-root');
const profileTrigger = document.getElementById('profile-trigger');
const profileMenu = document.getElementById('profile-menu');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const profileInitial = document.getElementById('profile-initial');
const adminPanelLink = document.getElementById('admin-panel-link');
const profileLogoutBtn = document.getElementById('profile-logout-menu-btn');

// Choice modal
const closeAuthChoice = document.getElementById('close-auth-choice');
const authChoiceBackdrop = document.getElementById('auth-choice-backdrop');
const goToLoginBtn = document.getElementById('go-to-login-btn');
const goToSignupBtn = document.getElementById('go-to-signup-btn');

// Login modal
const closeAuthLogin = document.getElementById('close-auth-login');
const authLoginBackdrop = document.getElementById('auth-login-backdrop');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const switchToSignup = document.getElementById('switch-to-signup');
const loginStatus = document.getElementById('login-status');

// Signup modal
const closeAuthSignup = document.getElementById('close-auth-signup');
const authSignupBackdrop = document.getElementById('auth-signup-backdrop');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupPasswordConfirm = document.getElementById('signup-password-confirm');
const signupSubmitBtn = document.getElementById('signup-submit-btn');
const switchToLogin = document.getElementById('switch-to-login');
const signupStatus = document.getElementById('signup-status');

// Admin modal
const closeAdmin = document.getElementById('close-admin');
const adminBackdrop = document.getElementById('admin-backdrop');
const adminTabs = document.querySelectorAll('.admin-tab');
const adminTabContents = document.querySelectorAll('.admin-tab-content');
const promoGenerateBtn = document.getElementById('promo-generate-btn');
const promoDuration = document.getElementById('promo-duration');
const promoResult = document.getElementById('promo-result');
const promoList = document.getElementById('promo-list');
const usersList = document.getElementById('users-list');
const vipList = document.getElementById('vip-list');
const adminStatus = document.getElementById('admin-status');

// Current user
let currentUser = null;
let userRole = 'user';

// === MODAL FUNCTIONS ===
function openModal(modal) {
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// === USER STORAGE ===
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}

function saveUser(email, password, role = 'user') {
  const users = getUsers();
  users[email] = { email, password, role, created_at: Date.now() };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUser(email) {
  const users = getUsers();
  return users[email] || null;
}

function getAllUsers() {
  return Object.values(getUsers());
}

// === SESSION ===
function setSession(email) {
  const user = getUser(email);
  if (user) {
    currentUser = user;
    userRole = user.role;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, role: user.role }));
  }
}

function clearSession() {
  currentUser = null;
  userRole = 'user';
  localStorage.removeItem(SESSION_KEY);
}

function checkSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
  if (session.email) {
    const user = getUser(session.email);
    if (user) {
      currentUser = user;
      userRole = user.role;
      return true;
    }
  }
  return false;
}

// === AUTH CHOICE ===
if (openAuthBtn) {
  openAuthBtn.addEventListener('click', () => openModal(authChoiceModal));
}

if (closeAuthChoice) closeAuthChoice.addEventListener('click', () => closeModal(authChoiceModal));
if (authChoiceBackdrop) authChoiceBackdrop.addEventListener('click', () => closeModal(authChoiceModal));

if (goToLoginBtn) {
  goToLoginBtn.addEventListener('click', () => {
    closeModal(authChoiceModal);
    openModal(authLoginModal);
  });
}

if (goToSignupBtn) {
  goToSignupBtn.addEventListener('click', () => {
    closeModal(authChoiceModal);
    openModal(authSignupModal);
  });
}

// === LOGIN MODAL ===
if (closeAuthLogin) closeAuthLogin.addEventListener('click', () => closeModal(authLoginModal));
if (authLoginBackdrop) authLoginBackdrop.addEventListener('click', () => closeModal(authLoginModal));

if (switchToSignup) {
  switchToSignup.addEventListener('click', () => {
    closeModal(authLoginModal);
    openModal(authSignupModal);
  });
}

if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', handleLogin);
}

// === SIGNUP MODAL ===
if (closeAuthSignup) closeAuthSignup.addEventListener('click', () => closeModal(authSignupModal));
if (authSignupBackdrop) authSignupBackdrop.addEventListener('click', () => closeModal(authSignupModal));

if (switchToLogin) {
  switchToLogin.addEventListener('click', () => {
    closeModal(authSignupModal);
    openModal(authLoginModal);
  });
}

if (signupSubmitBtn) {
  signupSubmitBtn.addEventListener('click', handleSignup);
}

// === LOGOUT ===
if (profileLogoutBtn) {
  profileLogoutBtn.addEventListener('click', () => {
    clearSession();
    updateUI();
    closeModal(authLoginModal);
  });
}

// === ADMIN MODAL ===
if (closeAdmin) closeAdmin.addEventListener('click', () => closeModal(adminModal));
if (adminBackdrop) adminBackdrop.addEventListener('click', () => closeModal(adminModal));

// Admin tabs
adminTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    adminTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    adminTabContents.forEach((content) => {
      content.classList.toggle('hidden', content.id !== `${tabName}-tab`);
    });
    if (tabName === 'promo') loadPromoCodes();
    if (tabName === 'users') loadUsers();
    if (tabName === 'vip') loadVIP();
  });
});

// === PROFILE MENU ===
if (profileTrigger) {
  profileTrigger.addEventListener('click', () => {
    profileMenu.classList.toggle('hidden');
  });
}

if (profileMenu) {
  document.addEventListener('click', (e) => {
    if (profileRoot && !profileRoot.contains(e.target)) {
      profileMenu.classList.add('hidden');
    }
  });
}

// === UPDATE UI ===
function updateUI() {
  const isLoggedIn = !!currentUser;

  // Show/hide login button
  if (openAuthBtn) {
    openAuthBtn.classList.toggle('hidden', isLoggedIn);
  }

  // Show/hide profile
  if (profileRoot) {
    profileRoot.classList.toggle('hidden', !isLoggedIn);
  }

  if (isLoggedIn && profileEmail) {
    profileEmail.textContent = currentUser.email;
    profileRole.textContent = userRole;
    profileInitial.textContent = currentUser.email.charAt(0).toUpperCase();

    // Show admin panel if admin
    if (adminPanelLink) {
      adminPanelLink.classList.toggle('hidden', userRole !== 'admin');
    }
  }
}

// === LOGIN ===
function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginStatus.textContent = 'Введите email и пароль';
    loginStatus.style.color = '#ff7b72';
    return;
  }

  loginSubmitBtn.disabled = true;
  loginStatus.textContent = 'Вход...';
  loginStatus.style.color = '#fbbf24';

  const user = getUser(email);
  
  if (!user) {
    loginStatus.textContent = 'Неверный email или пароль';
    loginStatus.style.color = '#ff7b72';
  } else if (user.password !== password) {
    loginStatus.textContent = 'Неверный email или пароль';
    loginStatus.style.color = '#ff7b72';
  } else {
    setSession(email);
    loginStatus.textContent = 'Успешно!';
    loginStatus.style.color = '#4ade80';
    closeModal(authLoginModal);
    updateUI();
  }
  
  loginSubmitBtn.disabled = false;
}

// === SIGNUP ===
function handleSignup() {
  const email = signupEmail.value.trim();
  const password = signupPassword.value;
  const passwordConfirm = signupPasswordConfirm.value;

  if (!email || !password || !passwordConfirm) {
    signupStatus.textContent = 'Заполните все поля';
    signupStatus.style.color = '#ff7b72';
    return;
  }

  if (password !== passwordConfirm) {
    signupStatus.textContent = 'Пароли не совпадают';
    signupStatus.style.color = '#ff7b72';
    return;
  }

  if (password.length < 8) {
    signupStatus.textContent = 'Минимум 8 символов';
    signupStatus.style.color = '#ff7b72';
    return;
  }

  signupSubmitBtn.disabled = true;
  signupStatus.textContent = 'Регистрация...';
  signupStatus.style.color = '#fbbf24';

  const existingUser = getUser(email);
  
  if (existingUser) {
    signupStatus.textContent = 'Такой email уже зарегистрирован. Войдите!';
    signupStatus.style.color = '#fbbf24';
  } else {
    // Если это первый пользователь - делаем его админом
    const allUsers = getAllUsers();
    const role = allUsers.length === 0 ? 'admin' : 'user';
    
    saveUser(email, password, role);
    signupStatus.textContent = '✅ Успешно! Теперь войдите с этим паролем.';
    signupStatus.style.color = '#4ade80';
    
    closeModal(authSignupModal);
    openModal(authLoginModal);
    loginEmail.value = email;
    loginPassword.value = '';
    loginEmail.focus();
  }
  
  signupSubmitBtn.disabled = false;
}

// === ADMIN: GENERATE PROMO ===
if (promoGenerateBtn) {
  promoGenerateBtn.addEventListener('click', () => {
    if (userRole !== 'admin') {
      promoResult.textContent = 'Доступ запрещён';
      return;
    }

    const duration = parseInt(promoDuration.value);
    const code = 'PVO' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const descriptions = {
      0: 'Вечный',
      1: '1 час',
      2: '2 часа',
      3: '3 часа',
      24: 'Сутки',
      168: 'Неделя',
      744: 'Месяц',
      8760: 'Год'
    };

    promoResult.innerHTML = `
      <div class="promo-code-display">
        <strong>Промокод создан:</strong>
        <code class="promo-code">${code}</code>
        <span>${descriptions[duration] || duration + ' ч'}</span>
      </div>
    `;
  });
}

function loadPromoCodes() {
  promoList.innerHTML = '<p class="empty-row">Промокоды хранятся локально</p>';
}

function loadUsers() {
  if (userRole !== 'admin') return;

  const users = getAllUsers();
  usersList.innerHTML = users.map(u => `
    <div class="user-item">
      <span>${u.email}</span>
      <span class="role-badge ${u.role}">${u.role}</span>
    </div>
  `).join('');
}

function loadVIP() {
  vipList.innerHTML = '<p class="empty-row">VIP подписки хранятся локально</p>';
}

// === INITIALIZE ===
checkSession();
updateUI();
