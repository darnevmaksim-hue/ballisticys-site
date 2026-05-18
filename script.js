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

const authModal = document.getElementById('auth-modal');
if (authModal) {
  const RUNTIME_AUTH_KEY = 'ballisticys_auth_runtime_cfg';
  const openAuthBtn = document.getElementById('open-auth-modal');
  const closeAuthBtn = document.getElementById('close-auth-modal');
  const backdropBtn = document.getElementById('auth-modal-backdrop');
  const profileRoot = document.getElementById('profile-root');
  const profileTrigger = document.getElementById('profile-trigger');
  const profileMenu = document.getElementById('profile-menu');
  const profileEmail = document.getElementById('profile-email');
  const profileInitial = document.getElementById('profile-initial');
  const profileManageBtn = document.getElementById('profile-manage-btn');
  const profileLogoutMenuBtn = document.getElementById('profile-logout-menu-btn');
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const loginBtn = document.getElementById('auth-login-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const oauthButtons = Array.from(document.querySelectorAll('.oauth-btn[data-oauth-provider]'));
  const setupBox = document.getElementById('auth-setup-box');
  const setupUrlInput = document.getElementById('auth-supabase-url');
  const setupKeyInput = document.getElementById('auth-supabase-key');
  const setupSaveBtn = document.getElementById('auth-save-config-btn');
  const userBoxEl = document.getElementById('auth-user-box');
  const userEmailEl = document.getElementById('auth-user-email');
  const userLogoutBtn = document.getElementById('auth-logout-btn');
  const authStatusEl = document.getElementById('auth-status');

  const fileConfig = window.AUTH_CONFIG || {};
  const supabaseFactory = window.supabase;
  let supabaseClient = null;
  let authBound = false;
  let effectiveConfig = fileConfig;

  function readRuntimeConfig() {
    try {
      const raw = localStorage.getItem(RUNTIME_AUTH_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function getMergedConfig() {
    const runtime = readRuntimeConfig();
    // Всегда используем OAuth из fileConfig по умолчанию
    const defaultOAuth = fileConfig.oauthProviders || ['google', 'discord'];
    return {
      ...fileConfig,
      ...runtime,
      oauthProviders: Array.isArray(runtime.oauthProviders) && runtime.oauthProviders.length > 0 
        ? runtime.oauthProviders 
        : defaultOAuth
    };
  }

  function getAllowedProviders(config) {
    return Array.isArray(config.oauthProviders)
      ? config.oauthProviders.map((p) => String(p).toLowerCase())
      : ['google', 'discord'];
  }

  function updateProviderButtons(config) {
    const allowed = getAllowedProviders(config);
    console.log('[Auth] updateProviderButtons called with allowed:', allowed);
    oauthButtons.forEach((btn) => {
      const provider = String(btn.dataset.oauthProvider || '').toLowerCase();
      const shouldHide = !allowed.includes(provider);
      btn.classList.toggle('hidden', shouldHide);
      console.log(`[Auth] ${provider} button: ${shouldHide ? 'hidden' : 'shown'}`);
    });
  }

  function openAuthModal() {
    authModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    if (emailInput) emailInput.focus();
  }

  function closeAuthModal() {
    authModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function closeProfileMenu() {
    if (!profileMenu || !profileTrigger) return;
    profileMenu.classList.add('hidden');
    profileTrigger.setAttribute('aria-expanded', 'false');
  }

  function openProfileMenu() {
    if (!profileMenu || !profileTrigger) return;
    profileMenu.classList.remove('hidden');
    profileTrigger.setAttribute('aria-expanded', 'true');
  }

  function toggleProfileMenu() {
    if (!profileMenu) return;
    if (profileMenu.classList.contains('hidden')) {
      openProfileMenu();
    } else {
      closeProfileMenu();
    }
  }

  function hasValidAuthConfig(config) {
    return Boolean(config?.url && config?.anonKey);
  }

  function setAuthStatus(message, isError = false) {
    if (!authStatusEl) return;
    authStatusEl.textContent = `Статус: ${message}`;
    authStatusEl.style.color = isError ? '#ff7b72' : '';
  }

  function setUserChip(user) {
    console.log('[Auth] setUserChip called with:', user?.email || null);
    
    // Обновляем карточку пользователя в модалке
    if (userBoxEl && userEmailEl) {
      if (user && user.email) {
        userEmailEl.textContent = user.email;
        userBoxEl.classList.remove('hidden');
        console.log('[Auth] User box shown with email:', user.email);
      } else {
        userEmailEl.textContent = '—';
        userBoxEl.classList.add('hidden');
      }
    }

    // Скрываем кнопку входа, показываем профиль
    if (openAuthBtn) {
      if (user) {
        openAuthBtn.classList.add('hidden');
        console.log('[Auth] Login button hidden');
      } else {
        openAuthBtn.classList.remove('hidden');
        console.log('[Auth] Login button shown');
      }
    }
    
    // Показываем/скрываем профиль
    if (profileRoot) {
      if (user) {
        profileRoot.classList.remove('hidden');
        console.log('[Auth] Profile root shown');
      } else {
        profileRoot.classList.add('hidden');
        console.log('[Auth] Profile root hidden');
      }
    }
    
    // Обновляем профиль в дропдауне
    if (profileEmail) {
      profileEmail.textContent = user?.email || '—';
      console.log('[Auth] Profile email set to:', user?.email || '—');
    }
    
    // Обновляем инициал в аватаре
    if (profileInitial) {
      const first = String(user?.email || 'U').trim().charAt(0);
      profileInitial.textContent = first ? first.toUpperCase() : 'U';
      console.log('[Auth] Profile initial set to:', profileInitial.textContent);
    }
    
    // Закрываем меню если нет пользователя
    if (!user) closeProfileMenu();
  }

  function setAuthBusy(value) {
    [loginBtn, signupBtn, userLogoutBtn, setupSaveBtn, ...oauthButtons].forEach((el) => {
      if (el) el.disabled = value;
    });
  }

  function getBaseRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}#auth`;
  }

  async function applySession(session) {
    const user = session?.user || null;
    console.log('[Auth] applySession called with user:', user?.email || null);
    setUserChip(user);
    if (!user) {
      setAuthStatus('не выполнен вход.');
      return;
    }
    setAuthStatus(`вход выполнен: ${user.email}`);
    closeAuthModal();
    
    // Явно показываем профиль после входа
    if (profileRoot) {
      profileRoot.classList.remove('hidden');
      console.log('[Auth] Profile root shown');
    }
    if (openAuthBtn) {
      openAuthBtn.classList.add('hidden');
      console.log('[Auth] Login button hidden');
    }
  }

  function initSupabaseClient() {
    effectiveConfig = getMergedConfig();
    updateProviderButtons(effectiveConfig);

    if (setupUrlInput && !setupUrlInput.value && effectiveConfig.url) {
      setupUrlInput.value = effectiveConfig.url;
    }
    if (setupKeyInput && !setupKeyInput.value && effectiveConfig.anonKey) {
      setupKeyInput.value = effectiveConfig.anonKey;
    }

    if (!supabaseFactory || !hasValidAuthConfig(effectiveConfig)) {
      supabaseClient = null;
      if (setupBox) setupBox.classList.remove('hidden');
      setAuthStatus('auth не настроен. Заполни Supabase URL и Anon Key ниже.', true);
      return;
    }

    supabaseClient = supabaseFactory.createClient(effectiveConfig.url, effectiveConfig.anonKey);
    if (setupBox) setupBox.classList.add('hidden');
    setAuthStatus('готово к входу.');
  }

  function bindSessionHandlers() {
    if (!supabaseClient || authBound) return;
    authBound = true;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session);
    });
    supabaseClient.auth.getSession().then(async ({ data }) => {
      await applySession(data?.session || null);
    });
  }

  function saveRuntimeAuthConfig() {
    const url = String(setupUrlInput?.value || '').trim();
    const anonKey = String(setupKeyInput?.value || '').trim();
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      setAuthStatus('некорректный Supabase URL.', true);
      return;
    }
    if (anonKey.length < 40) {
      setAuthStatus('некорректный Anon Key.', true);
      return;
    }
    try {
      localStorage.setItem(RUNTIME_AUTH_KEY, JSON.stringify({ url, anonKey }));
      setAuthStatus('настройки сохранены, перезагружаю...');
      location.reload();
    } catch (error) {
      setAuthStatus(`не удалось сохранить настройки: ${error.message}`, true);
    }
  }

  async function loginWithPassword() {
    const email = String(emailInput?.value || '').trim();
    const password = String(passInput?.value || '');
    if (!email || !password) {
      setAuthStatus('введите email и пароль.', true);
      return;
    }
    if (!supabaseClient) {
      setAuthStatus('auth не настроен. Заполни Supabase URL и Anon Key.', true);
      return;
    }
    setAuthBusy(true);
    setAuthStatus('вход...');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    
    if (error) {
      setAuthStatus(error.message, true);
      console.error('[Auth] Login error:', error);
      return;
    }
    
    console.log('[Auth] Login successful:', data?.user?.email);
    setAuthStatus(`вход выполнен: ${email}`);
    closeAuthModal();
    
    // Явно обновляем UI после успешного входа
    await applySession(data?.session || null);
  }

  async function signUpWithPassword() {
    const email = String(emailInput?.value || '').trim();
    const password = String(passInput?.value || '');
    if (!email || !password) {
      setAuthStatus('введите email и пароль.', true);
      return;
    }
    if (password.length < 8) {
      setAuthStatus('минимум 8 символов в пароле.', true);
      return;
    }
    if (!supabaseClient) {
      setAuthStatus('auth не настроен. Заполни Supabase URL и Anon Key.', true);
      return;
    }
    setAuthBusy(true);
    setAuthStatus('регистрация...');
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getBaseRedirectUrl() }
    });
    setAuthBusy(false);
    if (error) {
      setAuthStatus(error.message, true);
      return;
    }
    setAuthStatus('регистрация отправлена. Подтвердите email, если включено подтверждение.');
  }

  async function loginWithOAuth(provider) {
    if (!supabaseClient) {
      setAuthStatus('auth не настроен. Заполни Supabase URL и Anon Key.', true);
      return;
    }
    setAuthBusy(true);
    setAuthStatus(`перенаправление в ${provider}...`);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getBaseRedirectUrl() }
    });
    setAuthBusy(false);
    if (error) {
      setAuthStatus(error.message, true);
    }
  }

  async function logoutUser() {
    if (!supabaseClient) {
      setAuthStatus('auth не настроен. Заполни Supabase URL и Anon Key.', true);
      return;
    }
    await supabaseClient.auth.signOut();
    setUserChip(null);
    setAuthStatus('выполнен выход.');
  }

  if (openAuthBtn) openAuthBtn.addEventListener('click', openAuthModal);
  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
  if (backdropBtn) backdropBtn.addEventListener('click', closeAuthModal);
  if (profileTrigger) profileTrigger.addEventListener('click', toggleProfileMenu);
  if (profileManageBtn) {
    profileManageBtn.addEventListener('click', () => {
      closeProfileMenu();
      openAuthModal();
    });
  }
  if (profileLogoutMenuBtn) {
    profileLogoutMenuBtn.addEventListener('click', async () => {
      closeProfileMenu();
      await logoutUser();
    });
  }
  document.addEventListener('click', (event) => {
    if (!profileRoot || !profileMenu) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!profileRoot.contains(target)) closeProfileMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAuthModal();
      closeProfileMenu();
    }
  });

  oauthButtons.forEach((btn) => {
    const provider = String(btn.dataset.oauthProvider || '').toLowerCase();
    btn.addEventListener('click', () => loginWithOAuth(provider));
  });

  if (loginBtn) loginBtn.addEventListener('click', loginWithPassword);
  if (signupBtn) signupBtn.addEventListener('click', signUpWithPassword);
  if (setupSaveBtn) setupSaveBtn.addEventListener('click', saveRuntimeAuthConfig);
  if (passInput) {
    passInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loginWithPassword();
      }
    });
  }
  if (userLogoutBtn) userLogoutBtn.addEventListener('click', logoutUser);

  initSupabaseClient();
  bindSessionHandlers();

  if (window.location.hash === '#auth') {
    openAuthModal();
  }
}
