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
  const openAuthBtn = document.getElementById('open-auth-modal');
  const closeAuthBtn = document.getElementById('close-auth-modal');
  const backdropBtn = document.getElementById('auth-modal-backdrop');
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const loginBtn = document.getElementById('auth-login-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const oauthButtons = Array.from(document.querySelectorAll('.oauth-btn[data-oauth-provider]'));
  const userBoxEl = document.getElementById('auth-user-box');
  const userEmailEl = document.getElementById('auth-user-email');
  const userLogoutBtn = document.getElementById('auth-logout-btn');
  const authStatusEl = document.getElementById('auth-status');

  const authConfig = window.AUTH_CONFIG || {};
  const hasAuthConfig = Boolean(authConfig.url && authConfig.anonKey);
  const supabaseFactory = window.supabase;
  const supabaseClient = (supabaseFactory && hasAuthConfig)
    ? supabaseFactory.createClient(authConfig.url, authConfig.anonKey)
    : null;
  const allowedProviders = Array.isArray(authConfig.oauthProviders)
    ? authConfig.oauthProviders.map((p) => String(p).toLowerCase())
    : ['google', 'discord'];

  function openAuthModal() {
    authModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    if (emailInput) emailInput.focus();
  }

  function closeAuthModal() {
    authModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function setAuthStatus(message, isError = false) {
    if (!authStatusEl) return;
    authStatusEl.textContent = `Статус: ${message}`;
    authStatusEl.style.color = isError ? '#ff7b72' : '';
  }

  function setUserChip(user) {
    if (!userBoxEl || !userEmailEl) return;
    if (user && user.email) {
      userEmailEl.textContent = user.email;
      userBoxEl.classList.remove('hidden');
    } else {
      userEmailEl.textContent = '—';
      userBoxEl.classList.add('hidden');
    }
  }

  function setAuthBusy(value) {
    [loginBtn, signupBtn, userLogoutBtn, ...oauthButtons].forEach((el) => {
      if (el) el.disabled = value;
    });
  }

  function getBaseRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}#auth`;
  }

  async function applySession(session) {
    const user = session?.user || null;
    setUserChip(user);
    if (!user) {
      setAuthStatus('не выполнен вход.');
      return;
    }
    setAuthStatus('вход выполнен.');
    closeAuthModal();
  }

  async function loginWithPassword() {
    const email = String(emailInput?.value || '').trim();
    const password = String(passInput?.value || '');
    if (!email || !password) {
      setAuthStatus('введите email и пароль.', true);
      return;
    }
    if (!supabaseClient) {
      setAuthStatus('auth не настроен. Заполните auth-config.js', true);
      return;
    }
    setAuthBusy(true);
    setAuthStatus('вход...');
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    if (error) {
      setAuthStatus(error.message, true);
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
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
      setAuthStatus('auth не настроен. Заполните auth-config.js', true);
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
      setAuthStatus('auth не настроен. Заполните auth-config.js', true);
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
      setAuthStatus('auth не настроен. Заполните auth-config.js', true);
      return;
    }
    await supabaseClient.auth.signOut();
    setUserChip(null);
    setAuthStatus('выполнен выход.');
  }

  if (openAuthBtn) openAuthBtn.addEventListener('click', openAuthModal);
  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
  if (backdropBtn) backdropBtn.addEventListener('click', closeAuthModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAuthModal();
  });

  oauthButtons.forEach((btn) => {
    const provider = String(btn.dataset.oauthProvider || '').toLowerCase();
    if (!allowedProviders.includes(provider)) {
      btn.classList.add('hidden');
      return;
    }
    btn.addEventListener('click', () => loginWithOAuth(provider));
  });

  if (loginBtn) loginBtn.addEventListener('click', loginWithPassword);
  if (signupBtn) signupBtn.addEventListener('click', signUpWithPassword);
  if (passInput) {
    passInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loginWithPassword();
      }
    });
  }
  if (userLogoutBtn) userLogoutBtn.addEventListener('click', logoutUser);

  if (!supabaseClient) {
    setAuthStatus('auth не настроен. Заполните auth-config.js', true);
  } else {
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session);
    });

    supabaseClient.auth.getSession().then(async ({ data }) => {
      await applySession(data?.session || null);
    });
  }

  if (window.location.hash === '#auth') {
    openAuthModal();
  }
}
