// === FILTERT BUTTONS ===
const filterButtons = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.mod-card');

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    cards.forEach((card) => {
      const core = card.dataset.core;
      const visible = filter === 'all' || filter === core;
      card.classList.toggle('hidden', !visible);
    });
  });
});

// === REVEAL ANIMATION ===
const revealNodes = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealNodes.forEach((node) => revealObserver.observe(node));

// === COUNTER ANIMATION ===
function animateCounters() {
  const counters = document.querySelectorAll('.metric-value[data-count]');
  counters.forEach((counter) => {
    const target = Number(counter.dataset.count || 0);
    const isMs = counter.textContent.includes('ms') || target > 100;
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(target * progress);
      counter.textContent = isMs ? `${value}ms` : `${value}%`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
animateCounters();

// === AUTH SYSTEM ===
const RUNTIME_AUTH_KEY = 'ballisticys_auth_runtime_cfg';

// Modal elements
const authChoiceModal = document.getElementById('auth-choice-modal');
const authLoginModal = document.getElementById('auth-login-modal');
const authSignupModal = document.getElementById('auth-signup-modal');
const authSetupModal = document.getElementById('auth-setup-modal');
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

// Setup modal
const closeAuthSetup = document.getElementById('close-auth-setup');
const authSetupBackdrop = document.getElementById('auth-setup-backdrop');
const setupUrl = document.getElementById('setup-url');
const setupKey = document.getElementById('setup-key');
const setupSaveBtn = document.getElementById('setup-save-btn');
const setupStatus = document.getElementById('setup-status');

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

let supabaseClient = null;
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

// === SETUP MODAL ===
if (closeAuthSetup) closeAuthSetup.addEventListener('click', () => closeModal(authSetupModal));
if (authSetupBackdrop) authSetupBackdrop.addEventListener('click', () => closeModal(authSetupModal));

if (setupSaveBtn) {
  setupSaveBtn.addEventListener('click', saveSetup);
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

// === SUPABASE INIT ===
function initSupabase() {
  const runtimeCfg = JSON.parse(localStorage.getItem(RUNTIME_AUTH_KEY) || '{}');
  const fileCfg = window.AUTH_CONFIG || {};
  const url = runtimeCfg.url || fileCfg.url;
  const key = runtimeCfg.key || fileCfg.anonKey;

  if (!url || !key) {
    setupStatus.textContent = 'Не настроено. Откройте настройки.';
    setupStatus.style.color = '#ff7b72';
    return;
  }

  supabaseClient = window.supabase.createClient(url, key);
  setupStatus.textContent = 'Готово';
  setupStatus.style.color = '#4ade80';

  // Listen auth state
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state:', event, session?.user?.email);
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      updateUserProfile();
      closeModal(authLoginModal);
      closeModal(authSignupModal);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      userRole = 'user';
      updateUI();
    }
  });

  // Check existing session
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      currentUser = data.session.user;
      updateUserProfile();
    }
  });
}

async function updateUserProfile() {
  if (!currentUser || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (data) {
    userRole = data.role;
  }

  updateUI();
}

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
async function handleLogin() {
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

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  loginSubmitBtn.disabled = false;

  if (error) {
    loginStatus.textContent = error.message;
    loginStatus.style.color = '#ff7b72';
  } else {
    loginStatus.textContent = 'Успешно!';
    loginStatus.style.color = '#4ade80';
  }
}

// === SIGNUP ===
async function handleSignup() {
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

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  signupSubmitBtn.disabled = false;

  if (error) {
    signupStatus.textContent = error.message;
    signupStatus.style.color = '#ff7b72';
  } else {
    if (data.user?.identities?.length === 0) {
      signupStatus.textContent = 'Такой email уже зарегистрирован. Войдите!';
      signupStatus.style.color = '#fbbf24';
    } else {
      signupStatus.textContent = '✅ Успешно! Теперь войдите с этим паролем.';
      signupStatus.style.color = '#4ade80';
      setTimeout(() => {
        closeModal(authSignupModal);
        openModal(authLoginModal);
        loginEmail.value = email;
        loginPassword.value = '';
        loginEmail.focus();
      }, 2000);
    }
  }
}

// === SETUP ===
function saveSetup() {
  const url = setupUrl.value.trim();
  const key = setupKey.value.trim();

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    setupStatus.textContent = 'Неверный URL';
    setupStatus.style.color = '#ff7b72';
    return;
  }

  if (key.length < 20) {
    setupStatus.textContent = 'Неверный ключ';
    setupStatus.style.color = '#ff7b72';
    return;
  }

  localStorage.setItem(RUNTIME_AUTH_KEY, JSON.stringify({ url, key }));
  setupStatus.textContent = 'Сохранено! Перезагрузка...';
  setupStatus.style.color = '#4ade80';
  setTimeout(() => location.reload(), 1500);
}

// === ADMIN: GENERATE PROMO ===
promoGenerateBtn.addEventListener('click', async () => {
  if (!supabaseClient || userRole !== 'admin') {
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

  const { error } = await supabaseClient.from('promo_codes').insert({
    code,
    duration_hours: duration,
    description: descriptions[duration],
    created_by: currentUser.id,
  });

  if (error) {
    promoResult.innerHTML = `<p style="color:#ff7b72">Ошибка: ${error.message}</p>`;
  } else {
    promoResult.innerHTML = `
      <div class="promo-code-display">
        <strong>Промокод создан:</strong>
        <code class="promo-code">${code}</code>
        <span>${descriptions[duration]}</span>
      </div>
    `;
  }
});

async function loadPromoCodes() {
  if (!supabaseClient || userRole !== 'admin') return;

  const { data, error } = await supabaseClient
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    promoList.innerHTML = `<p style="color:#ff7b72">Ошибка: ${error.message}</p>`;
    return;
  }

  promoList.innerHTML = data.map(p => `
    <div class="promo-item ${p.is_used ? 'used' : ''}">
      <code>${p.code}</code>
      <span>${p.description}</span>
      <span>${p.is_used ? '✅ Использован' : '○ Активен'}</span>
    </div>
  `).join('');
}

async function loadUsers() {
  if (!supabaseClient || userRole !== 'admin') return;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    usersList.innerHTML = `<p style="color:#ff7b72">Ошибка: ${error.message}</p>`;
    return;
  }

  usersList.innerHTML = data.map(u => `
    <div class="user-item">
      <span>${u.email}</span>
      <span class="role-badge ${u.role}">${u.role}</span>
    </div>
  `).join('');
}

async function loadVIP() {
  if (!supabaseClient || userRole !== 'admin') return;

  const { data, error } = await supabaseClient
    .from('vip_subscriptions')
    .select('*, profiles(email)')
    .eq('is_active', true)
    .gte('end_time', new Date().toISOString())
    .limit(20);

  if (error) {
    vipList.innerHTML = `<p style="color:#ff7b72">Ошибка: ${error.message}</p>`;
    return;
  }

  vipList.innerHTML = data.map(v => `
    <div class="vip-item">
      <span>${v.profiles?.email || 'Unknown'}</span>
      <span>До: ${new Date(v.end_time).toLocaleDateString()}</span>
    </div>
  `).join('');
}

// === INITIALIZE ===
initSupabase();