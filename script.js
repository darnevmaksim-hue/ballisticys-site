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

const controlRoot = document.getElementById('control');
if (controlRoot) {
  const REPO = 'darnevmaksim-hue/ballisticys-site';
  const BRANCH = 'main';
  const authRoot = document.getElementById('admin-auth');
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const loginBtn = document.getElementById('auth-login-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const oauthButtons = Array.from(document.querySelectorAll('.oauth-btn[data-oauth-provider]'));
  const logoutBtn = document.getElementById('admin-logout-btn');
  const authStatusEl = document.getElementById('auth-status');
  const userBoxEl = document.getElementById('auth-user-box');
  const userEmailEl = document.getElementById('auth-user-email');
  const userLogoutBtn = document.getElementById('auth-logout-btn');
  const stateEl = document.getElementById('fetch-state');
  const rateLimitEl = document.getElementById('rate-limit');
  const refreshBtn = document.getElementById('refresh-btn');
  const assetsBody = document.getElementById('assets-body');
  const authRequired = Boolean(authRoot && emailInput && passInput && loginBtn && signupBtn);
  const authConfig = window.AUTH_CONFIG || {};
  const hasAuthConfig = Boolean(authConfig.url && authConfig.anonKey);
  const supabaseFactory = window.supabase;
  const supabaseClient = (supabaseFactory && hasAuthConfig)
    ? supabaseFactory.createClient(authConfig.url, authConfig.anonKey)
    : null;
  const allowedProviders = Array.isArray(authConfig.oauthProviders)
    ? authConfig.oauthProviders.map((p) => String(p).toLowerCase())
    : ['google', 'discord'];
  const adminEmails = Array.isArray(authConfig.adminEmails)
    ? authConfig.adminEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];
  const allowAnySignedIn = authConfig.allowAnySignedIn === true;
  let statsLoaded = false;

  function unlockAdmin() {
    controlRoot.classList.remove('hidden');
    controlRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!statsLoaded) {
      statsLoaded = true;
      fetchDownloadsStats();
    }
  }

  function hideAdminPanel() {
    controlRoot.classList.add('hidden');
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

  function isAdminUser(user) {
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) return false;
    if (allowAnySignedIn) return true;
    if (!adminEmails.length) return false;
    return adminEmails.includes(email);
  }

  function setAuthBusy(value) {
    [loginBtn, signupBtn, userLogoutBtn, ...oauthButtons].forEach((el) => {
      if (el) el.disabled = value;
    });
  }

  function getBaseRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}#admin-auth`;
  }

  async function applySession(session) {
    const user = session?.user || null;
    setUserChip(user);
    if (!user) {
      hideAdminPanel();
      setAuthStatus('не выполнен вход.');
      return;
    }

    if (!isAdminUser(user)) {
      hideAdminPanel();
      setAuthStatus('вход выполнен, но нет админ-доступа.', true);
      return;
    }

    setAuthStatus('админ-доступ подтвержден.');
    unlockAdmin();
  }

  async function loginWithPassword() {
    if (!supabaseClient) return;
    const email = String(emailInput?.value || '').trim();
    const password = String(passInput?.value || '');
    if (!email || !password) {
      setAuthStatus('введите email и пароль.', true);
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
    if (!supabaseClient) return;
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
    if (!supabaseClient) return;
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
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    hideAdminPanel();
    setUserChip(null);
    setAuthStatus('выполнен выход.');
  }

  function setCount(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function detectType(assetName) {
    const name = String(assetName || '').toLowerCase();
    if (name.includes('agent')) return 'agent';
    if (name.includes('injector') || name.includes('toolkit')) return 'injector';
    if (name.includes('forge') || name.includes('blur')) return 'forge';
    if (name.includes('fabric')) return 'fabric';
    return 'other';
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 1) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ru-RU');
  }

  function renderAssetsRows(rows) {
    if (!assetsBody) return;
    if (!rows.length) {
      assetsBody.innerHTML = '<tr><td class="empty-row" colspan="7">Ассеты не найдены</td></tr>';
      return;
    }
    assetsBody.innerHTML = rows.map((row) => `
      <tr>
        <td><span class="pill ${row.type}">${row.type}</span></td>
        <td>${row.name}</td>
        <td>${row.path}</td>
        <td>${row.sha}</td>
        <td>${formatBytes(row.size)}</td>
        <td>${formatDate(row.updatedAt)}</td>
        <td><a href="${row.url}" target="_blank" rel="noopener noreferrer">Открыть</a></td>
      </tr>
    `).join('');
  }

  async function fetchLastCommitDate(path) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&path=${encodeURIComponent(path)}&per_page=1`);
    if (!response.ok) return '';
    const commits = await response.json();
    if (!Array.isArray(commits) || !commits.length) return '';
    return commits[0]?.commit?.committer?.date || commits[0]?.commit?.author?.date || '';
  }

  async function fetchDownloadsStats() {
    if (refreshBtn) refreshBtn.disabled = true;
    if (stateEl) stateEl.textContent = 'Состояние: загрузка данных...';
    try {
      const response = await fetch(`https://api.github.com/repos/${REPO}/contents/downloads?ref=${BRANCH}`);
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

      const files = await response.json();
      if (!Array.isArray(files)) throw new Error('Invalid GitHub API response');

      if (rateLimitEl) {
        const remaining = response.headers.get('x-ratelimit-remaining') ?? '-';
        const limit = response.headers.get('x-ratelimit-limit') ?? '-';
        rateLimitEl.textContent = `GitHub API rate limit: ${remaining} / ${limit}`;
      }

      let fabric = 0;
      let forge = 0;
      let injector = 0;
      let agent = 0;
      let totalSize = 0;
      let filesCount = 0;
      const rows = [];

      const downloadFiles = files.filter((item) => item && item.type === 'file');
      const updatedAtList = await Promise.all(downloadFiles.map((item) => fetchLastCommitDate(item.path)));

      downloadFiles.forEach((file, index) => {
        const type = detectType(file.name);
        if (type === 'fabric') fabric += 1;
        if (type === 'forge') forge += 1;
        if (type === 'injector') injector += 1;
        if (type === 'agent') agent += 1;
        totalSize += Number(file.size || 0);
        filesCount += 1;

        rows.push({
          type,
          name: file.name || 'unknown',
          path: file.path || '-',
          sha: String(file.sha || '').slice(0, 10) || '-',
          size: Number(file.size || 0),
          updatedAt: updatedAtList[index] || '',
          url: file.html_url || file.download_url || '#'
        });
      });

      rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      renderAssetsRows(rows);

      setCount('count-fabric', fabric);
      setCount('count-forge', forge);
      setCount('count-injector', injector);
      setCount('count-agent', agent);
      setCount('count-total', formatBytes(totalSize));
      setCount('count-releases', filesCount);
      setCount('count-assets', rows[0]?.updatedAt ? formatDate(rows[0].updatedAt) : '-');
      if (stateEl) stateEl.textContent = `Состояние: обновлено ${formatDate(new Date().toISOString())}`;
    } catch (error) {
      ['count-fabric', 'count-forge', 'count-injector', 'count-agent', 'count-total', 'count-releases', 'count-assets']
        .forEach((id) => setCount(id, '-'));
      if (assetsBody) {
        assetsBody.innerHTML = '<tr><td class="empty-row" colspan="7">Ошибка загрузки данных GitHub API</td></tr>';
      }
      if (stateEl) stateEl.textContent = `Состояние: ошибка (${error.message})`;
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchDownloadsStats);
  }

  if (authRequired) {
    oauthButtons.forEach((btn) => {
      const provider = String(btn.dataset.oauthProvider || '').toLowerCase();
      if (!allowedProviders.includes(provider)) {
        btn.classList.add('hidden');
        return;
      }
      btn.addEventListener('click', () => loginWithOAuth(provider));
    });

    loginBtn.addEventListener('click', loginWithPassword);
    signupBtn.addEventListener('click', signUpWithPassword);
    passInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loginWithPassword();
      }
    });

    if (userLogoutBtn) userLogoutBtn.addEventListener('click', logoutUser);
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

    if (!supabaseClient) {
      hideAdminPanel();
      setAuthStatus('auth не настроен. Заполните auth-config.js', true);
      setAuthBusy(true);
    } else {
      supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        await applySession(session);
      });

      supabaseClient.auth.getSession().then(async ({ data }) => {
        await applySession(data?.session || null);
      });

      if (emailInput) emailInput.focus();
    }
  } else {
    fetchDownloadsStats();
  }
}
