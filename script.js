const AUTH_CONFIG = window.AUTH_CONFIG || {};
let sb = null;
const SS_KEY = 'ballisticys_session';
const USER_KEY = 'ballisticys_user';
let currentUser = null;
let currentSession = null;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('Timeout')); }, ms);
    })
  ]);
}

var EDGE_FN = AUTH_CONFIG.url + '/functions/v1/download';

function getSessionToken() {
  if (currentSession?.access_token) return currentSession.access_token;
  try {
    var saved = JSON.parse(localStorage.getItem(SS_KEY));
    return saved?.access_token || null;
  } catch(_) { return null; }
}

var DOWNLOAD_MAP = {
  "Ballistics Calculator (Fabric)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-fabric.jar",
  "Ballistics Calculator (Fabric)|1.20.1": "bbb-fabric-port-2.0pre4-fabric-port.jar",
  "Ballistics Calculator (Forge)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-forge.jar",
  "Ballistics Calculator (Forge)|1.20.1": "blur-mod-1.0.0-forge.jar",
  "Ballistics Calculator (NeoForge)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-neoforge.jar",
  "Ballistics Calculator (NeoForge)|1.20.1": "ballistic-calculator-1.0.0-1.20.1-neoforge.jar",
};

var DOWNLOAD_BASE = "https://raw.githubusercontent.com/darnevmaksim-hue/ballisticys-site/mod-files/downloads";

async function downloadMod(modName, mcVersion, target) {
  target = target || event?.target;
  if (target) { target.disabled = true; target.textContent = '⏳ Загрузка...'; }
  var key = modName + '|' + mcVersion;
  var file = DOWNLOAD_MAP[key];
  if (!file) {
    if (target) { target.disabled = false; target.textContent = 'Не найдено'; }
    return;
  }
  var token = getSessionToken();
  if (!token) {
    if (target) { target.disabled = false; target.textContent = 'Войдите в аккаунт'; }
    return;
  }
  try {
    var edgeUrl = EDGE_FN + '?mod=' + encodeURIComponent(modName) + '&mc=' + encodeURIComponent(mcVersion);
    var resp = await fetch(edgeUrl, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!resp.ok) {
      if (target) { target.disabled = false; target.textContent = 'Нет доступа'; }
      return;
    }
    var blob = await resp.blob();
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    if (target) { target.disabled = false; target.textContent = 'Скачано'; }
  } catch (_) {
    if (target) { target.disabled = false; target.textContent = 'Ошибка'; }
  }
}

function loadSupabaseSDK() {
  return new Promise(function(resolve) {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      resolve();
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = resolve;
    s.onerror = function() {
      var s2 = document.createElement('script');
      s2.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s2.onload = resolve;
      s2.onerror = resolve;
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  });
}

function changeGlobalMc(sel) {
  var mc = sel.value;
  var isVipUser = currentUser && (currentUser.role === 'vip' || currentUser.role === 'admin');
  var loggedIn = !!currentUser;
  document.querySelectorAll('.mc-data, .mc-dl').forEach(function(el) {
    var show = el.dataset.mc === mc || el.dataset.mc === 'any';
    if (show && el.dataset.vip === 'true' && !isVipUser) show = false;
    if (show && el.classList.contains('mc-dl') && !loggedIn) show = false;
    el.style.display = show ? '' : 'none';
  });
  applyCurrentFilter();
  updateRequestAreas();
}

let requestCache = null;

async function loadRequestStatus() {
  if (!sb || !currentUser) { requestCache = null; return; }
  try {
    const { data, error } = await withTimeout(
      sb.from('download_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      15000
    );
    if (!error && data) requestCache = data;
    else requestCache = null;
  } catch (_) { requestCache = null; }
}

function updateRequestAreas() {
  var mc = document.querySelector('.mc-global-select')?.value || '1.20.1';
  var isVipUser = currentUser && (currentUser.role === 'vip' || currentUser.role === 'admin');
  document.querySelectorAll('.request-area').forEach(function(area) {
    var areaMc = area.dataset.mc;
    if (areaMc !== mc && areaMc !== 'any') { area.style.display = 'none'; return; }
    if (isVipUser) { area.style.display = 'none'; return; }
    area.style.display = '';
    area.innerHTML = '';
    var modName = area.dataset.mod;
    if (!currentUser) {
      var btn = document.createElement('button');
      btn.className = 'request-btn';
      btn.textContent = 'Запросить скачивание';
      btn.addEventListener('click', function() {
        var authBtn = document.getElementById('open-auth-modal');
        if (authBtn) authBtn.click();
      });
      area.appendChild(btn);
      return;
    }
    var existing = requestCache ? requestCache.filter(function(r) { return r.mod_name === modName && (r.mc_version === mc || r.mc_version === 'any'); }) : [];
    var req = existing.length ? existing[0] : null;
    if (!req) {
      var formDiv = document.createElement('div');
      formDiv.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem';
      var descInput = document.createElement('textarea');
      descInput.className = 'auth-input';
      descInput.placeholder = 'Опишите зачем вам нужен этот мод (обязательно)';
      descInput.rows = 3;
      descInput.style.cssText = 'resize:vertical;font-size:0.85rem';
      var sendBtn = document.createElement('button');
      sendBtn.className = 'request-btn';
      sendBtn.textContent = 'Отправить запрос';
      sendBtn.addEventListener('click', function() {
        requestDownload(modName, area.dataset.mc === 'any' ? 'any' : mc, descInput.value, sendBtn);
      });
      formDiv.appendChild(descInput);
      formDiv.appendChild(sendBtn);
      area.appendChild(formDiv);
    } else if (req.status === 'pending') {
      var s = document.createElement('span');
      s.className = 'request-status pending';
      s.textContent = '⏳ Ожидает одобрения';
      area.appendChild(s);
    } else if (req.status === 'approved') {
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem';
      var usedKey = 'dl_used_' + req.id;
      var alreadyUsed = false;
      try { alreadyUsed = localStorage.getItem(usedKey) === '1'; } catch(_) {}
      if (alreadyUsed) {
        wrapper.innerHTML = '<p style="font-size:0.8rem;color:var(--text-dim)">Файл скачан. Отправьте новый запрос если нужно.</p>';
      } else {
        var btn = document.createElement('button');
        btn.className = 'btn primary';
        btn.style.cssText = 'padding:0.5rem 1rem;font-size:0.8rem';
        btn.textContent = 'Скачать';
        btn.addEventListener('click', function(e) {
          downloadMod(modName, mc, e.target);
          try { localStorage.setItem(usedKey, '1'); } catch(_) {}
          setTimeout(function() {
            updateRequestAreas();
          }, 500);
        });
        wrapper.appendChild(btn);
      }
      if (req.approved_promo_code) {
        var promoBox = document.createElement('div');
        promoBox.className = 'promo-code-display';
        promoBox.style.cssText = 'margin-top:0.3rem';
        promoBox.innerHTML = '<span style="font-size:0.75rem;color:var(--text-dim)">Ваш промокод:</span>' +
          '<span class="promo-code" style="font-size:0.9rem;padding:0.3rem 0.7rem">' + escapeHtml(req.approved_promo_code) + '</span>' +
          '<span style="font-size:0.7rem;color:#4ade80">(ключ доступа ' + (req.approved_promo_duration || 0) + 'ч)</span>';
        wrapper.appendChild(promoBox);
      }
      area.appendChild(wrapper);
    } else if (req.status === 'denied') {
      var s = document.createElement('span');
      s.className = 'request-status denied';
      s.textContent = 'Отказано';
      area.appendChild(s);
    }
  });
}

function renderRequestsHTML(data, list, durHtml) {
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет запросов</p>';
    return;
  }
  var userIds = [...new Set(data.map(function(r) { return r.user_id; }))];
  var emailMap = {};
  // Пытаемся получить email'ы через raceAdminLoad или прямой запрос
  (async function() {
    try {
      var profiles = await raceAdminLoad('users', sb ? sb.from('profiles').select('id, email').in('id', userIds) : null);
      if (Array.isArray(profiles)) profiles.forEach(function(p) { emailMap[p.id] = p.email || 'unknown'; });
    } catch (_) {}
    // Для тех, кого не нашли
    data.forEach(function(r) { if (!emailMap[r.user_id]) emailMap[r.user_id] = 'unknown'; });
    renderRequestsFinal(data, list, durHtml, emailMap);
  })();
}

function renderRequestsFinal(data, list, durHtml, emailMap) {
  list.innerHTML = data.map(function(r) {
    var email = emailMap[r.user_id] || 'unknown';
    var time = new Date(r.created_at).toLocaleString('ru-RU');
    var descHtml = r.description ? '<br><small style="color:var(--text-dim)">Причина: <em>' + escapeHtml(r.description) + '</em></small>' : '';
    var promoInfo = '';
    if (r.status === 'approved' && r.approved_promo_code) {
      promoInfo = '<br><small style="color:#4ade80">Промокод: <strong>' + escapeHtml(r.approved_promo_code) + '</strong> (' + (r.approved_promo_duration || 24) + 'ч)</small>';
    }
    var actions = '';
    if (r.status === 'pending') {
      actions = '<div style="display:flex;flex-direction:column;gap:0.3rem;align-items:flex-end">' +
        '<select class="promo-dur-select" data-req-id="' + r.id + '" style="padding:0.3rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);font-size:0.75rem">' + durHtml + '</select>' +
        '<div class="req-actions">' +
        '<button class="req-btn approve" data-req-id="' + r.id + '" data-action="approve">✅</button>' +
        '<button class="req-btn deny" data-req-id="' + r.id + '" data-action="deny">❌</button>' +
        '</div></div>';
    } else if (r.status === 'denied') {
      var denyInfo = r.deny_reason ? '<br><small style="color:#ff7b72">Причина отказа: <em>' + escapeHtml(r.deny_reason) + '</em></small>' : '';
      actions = '<span class="request-status denied">Отказано</span>' + denyInfo;
    } else {
      actions = '<span class="request-status approved">Одобрено</span>';
    }
    return '<div class="request-item">' +
      '<div class="req-info">' +
      '<strong>' + escapeHtml(email) + '</strong><br>' +
      escapeHtml(r.mod_name) + ' (' + r.mc_version + ')<br>' +
      '<small style="color:var(--text-dim)">' + time + '</small>' +
      descHtml + promoInfo +
      '</div>' + actions + '</div>';
  }).join('');
  // Привязываем обработчики кнопок
  list.querySelectorAll('.req-btn.approve').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var reqId = btn.dataset.reqId;
      var durSelect = document.querySelector('.promo-dur-select[data-req-id="' + reqId + '"]');
      var hours = parseInt(durSelect ? durSelect.value : 24);
      approveRequest(reqId, hours);
    });
  });
  list.querySelectorAll('.req-btn.deny').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var reason = prompt('Укажите причину отказа (обязательно):');
      if (reason === null) return;
      if (!reason || reason.trim().length < 2) { reason = 'Причина не указана'; }
      denyRequest(btn.dataset.reqId, reason.trim());
    });
  });
}

async function requestDownload(modName, mcVersion, description, btnEl) {
  if (!sb || !currentUser) return;
  if (!description || description.trim().length < 5) {
    btnEl.textContent = 'Опишите зачем вам нужен мод (мин. 5 символов)';
    setTimeout(function() { btnEl.textContent = 'Отправить запрос'; }, 3000);
    return;
  }
  btnEl.disabled = true;
  btnEl.textContent = '⏳ Отправка...';
  try {
    var { error } = await sb.from('download_requests').insert({
      user_id: currentUser.id,
      mod_name: modName,
      mc_version: mcVersion,
      status: 'pending',
      description: description.trim()
    });
    if (error) {
      btnEl.textContent = 'Ошибка: ' + error.message;
      return;
    }
    await loadRequestStatus();
    checkForRequestResponses();
    updateRequestAreas();
  } catch (_) {
    btnEl.textContent = 'Ошибка сети';
  }
}

function initSupabase() {
  if (AUTH_CONFIG.url && AUTH_CONFIG.anonKey) {
    // Мигрируем старый формат сессии (без expires_at) в формат Supabase
    try {
      const saved = localStorage.getItem(SS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.access_token && !parsed?.expires_at) {
          try {
            const payload = JSON.parse(atob(parsed.access_token.split('.')[1]));
            if (payload?.exp) {
              parsed.expires_at = payload.exp;
              parsed.token_type = 'bearer';
              parsed.expires_in = payload.exp - Math.floor(Date.now() / 1000);
              localStorage.setItem(SS_KEY, JSON.stringify(parsed));
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    sb = supabase.createClient(AUTH_CONFIG.url, AUTH_CONFIG.anonKey, {
      auth: {
        storageKey: SS_KEY,
        detectSessionInUrl: false,
        autoRefreshToken: true,
        persistSession: true,
      }
    });
  }
}

function setupAuthListener() {
  if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      currentSession = session;
    }
  });
}

const openAuthBtn = document.getElementById('open-auth-modal');
const profileRoot = document.getElementById('profile-root');
const profileTrigger = document.getElementById('profile-trigger');
const profileMenu = document.getElementById('profile-menu');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const profileInitial = document.getElementById('profile-initial');
const adminPanelLink = document.getElementById('admin-panel-link');
const profileLogoutBtn = document.getElementById('profile-logout-menu-btn');

const authChoiceModal = document.getElementById('auth-choice-modal');
const authLoginModal = document.getElementById('auth-login-modal');
const authSignupModal = document.getElementById('auth-signup-modal');
const adminModal = document.getElementById('admin-modal');

function closeAuth() {
  authChoiceModal?.classList.add('hidden');
  authLoginModal?.classList.add('hidden');
  authSignupModal?.classList.add('hidden');
}

function closeAdmin() {
  adminModal?.classList.add('hidden');
  stopAdminPolling();
}

openAuthBtn?.addEventListener('click', () => {
  authChoiceModal?.classList.remove('hidden');
});

document.getElementById('auth-choice-backdrop')?.addEventListener('click', closeAuth);
document.getElementById('auth-login-backdrop')?.addEventListener('click', closeAuth);
document.getElementById('auth-signup-backdrop')?.addEventListener('click', closeAuth);
document.getElementById('admin-backdrop')?.addEventListener('click', closeAdmin);

document.getElementById('close-auth-choice')?.addEventListener('click', closeAuth);
document.getElementById('close-auth-login')?.addEventListener('click', closeAuth);
document.getElementById('close-auth-signup')?.addEventListener('click', closeAuth);
document.getElementById('close-admin')?.addEventListener('click', closeAdmin);

document.getElementById('close-profile')?.addEventListener('click', () => {
  document.getElementById('profile-modal')?.classList.add('hidden');
});
document.getElementById('profile-backdrop')?.addEventListener('click', () => {
  document.getElementById('profile-modal')?.classList.add('hidden');
});

document.getElementById('go-to-login-btn')?.addEventListener('click', () => {
  authChoiceModal?.classList.add('hidden');
  authLoginModal?.classList.remove('hidden');
});

document.getElementById('go-to-signup-btn')?.addEventListener('click', () => {
  authChoiceModal?.classList.add('hidden');
  authSignupModal?.classList.remove('hidden');
});

document.getElementById('switch-to-signup')?.addEventListener('click', () => {
  authLoginModal?.classList.add('hidden');
  authSignupModal?.classList.remove('hidden');
});

document.getElementById('switch-to-login')?.addEventListener('click', () => {
  authSignupModal?.classList.add('hidden');
  authLoginModal?.classList.remove('hidden');
});

document.getElementById('signup-submit-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-password-confirm').value;
  const status = document.getElementById('signup-status');

  if (password !== confirm) {
    status.textContent = 'Пароли не совпадают'; status.style.color = '#ff7b72'; return;
  }
  if (password.length < 8) {
    status.textContent = 'Минимум 8 символов'; status.style.color = '#ff7b72'; return;
  }
  if (!sb) {
    status.textContent = 'Ошибка: Supabase не настроен'; status.style.color = '#ff7b72'; return;
  }

  status.textContent = 'Регистрация...'; status.style.color = 'var(--text-dim)';

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { role: 'user' } }
  });

  if (error) {
    status.textContent = 'Ошибка: ' + error.message; status.style.color = '#ff7b72'; return;
  }

  if (data?.user?.identities?.length === 0) {
    status.textContent = 'Email уже занят'; status.style.color = '#ff7b72'; return;
  }

  if (data?.session) {
    status.textContent = 'Успешно!';
    status.style.color = '#4ade80';
    authSignupModal?.classList.add('hidden');
    await loadSession();
    updateUI();
    startUserPolling();
  } else {
    status.textContent = 'Успешно! Проверьте почту для подтверждения.';
    status.style.color = '#4ade80';
    setTimeout(() => {
      authSignupModal?.classList.add('hidden');
      authLoginModal?.classList.remove('hidden');
      document.getElementById('login-email').value = email;
    }, 2000);
  }
});

document.getElementById('login-submit-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const status = document.getElementById('login-status');
  const forgot = document.getElementById('login-forgot');
  const btn = document.getElementById('login-submit-btn');

  if (!sb) {
    status.textContent = 'Ошибка: Supabase не настроен'; status.style.color = '#ff7b72'; return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Подключение...';
  status.textContent = 'Подключение к серверу...'; status.style.color = 'var(--text-dim)';

  let data, error;
  try {
    var result = await withTimeout(sb.auth.signInWithPassword({ email, password }), 60000);
    data = result.data;
    error = result.error;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Войти';
    status.textContent = 'Таймаут — сервер недоступен. Попробуйте позже.'; status.style.color = '#ff7b72'; return;
  }

  btn.disabled = false;
  btn.textContent = 'Войти';

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      status.textContent = 'Подтвердите email в письме'; status.style.color = '#ff7b72'; return;
    }
    if (error.message.includes('Invalid login credentials')) {
      status.textContent = 'Неверный email или пароль'; status.style.color = '#ff7b72';
      forgot?.classList.remove('hidden');
      return;
    }
    status.textContent = 'Ошибка: ' + error.message; status.style.color = '#ff7b72'; return;
  }

  status.textContent = 'Успешно!'; status.style.color = '#4ade80';
  authLoginModal?.classList.add('hidden');
  await loadSession();
  updateUI();
  startUserPolling();
});

document.getElementById('forgot-password-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const status = document.getElementById('login-status');

  if (!email) {
    status.textContent = 'Введите email'; status.style.color = '#ff7b72'; return;
  }
  if (!sb) {
    status.textContent = 'Ошибка: Supabase не настроен'; status.style.color = '#ff7b72'; return;
  }

  status.textContent = 'Отправка...'; status.style.color = 'var(--text-dim)';
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) {
    status.textContent = 'Ошибка: ' + error.message; status.style.color = '#ff7b72'; return;
  }
  status.textContent = 'Письмо для сброса отправлено на ' + email; status.style.color = '#4ade80';
  document.getElementById('login-forgot')?.classList.add('hidden');
});

profileLogoutBtn?.addEventListener('click', async () => {
  await sb?.auth.signOut();
  currentUser = null;
  currentSession = null;
  updateUI();
  profileMenu?.classList.add('hidden');
  stopUserPolling();
});

profileTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  profileMenu?.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (profileRoot && !profileRoot.contains(e.target)) {
    profileMenu?.classList.add('hidden');
  }
});

function toggleVipCards() {}

function applyCurrentFilter() {
  const active = document.querySelector('.filter.active');
  if (!active) return;
  const filter = active.dataset.filter;
  var isVipUser = currentUser && (currentUser.role === 'vip' || currentUser.role === 'admin');
  document.querySelectorAll('.mod-card').forEach(function(card) {
    if (card.dataset.vip === 'true' && !isVipUser) {
      card.style.display = 'none';
      return;
    }
    var visibleData = card.querySelector('.mc-data:not([style*="none"])') || card.querySelector('ul:not(.mc-data)');
    var hasVisible = !!visibleData;
    if (hasVisible && filter !== 'all' && card.dataset.core !== filter) hasVisible = false;
    card.style.display = hasVisible ? '' : 'none';
  });
}

function syncDownloadGates() {
  document.querySelectorAll('.auth-gate-btn').forEach(function(el) { el.remove(); });
  if (currentUser) return;
  var seen = new Set();
  document.querySelectorAll('.card-actions').forEach(function(parent) {
    if (seen.has(parent)) return;
    seen.add(parent);
    if (parent.querySelector('.request-area:not([style*="display: none"])')) return;
    var gate = document.createElement('button');
    gate.className = 'auth-gate-btn request-btn';
    gate.textContent = 'Войдите чтобы скачать';
    gate.addEventListener('click', function() {
      var authBtn = document.getElementById('open-auth-modal');
      if (authBtn) authBtn.click();
    });
    parent.appendChild(gate);
  });
}

function updateUI() {
  var isVip = currentUser && (currentUser.role === 'vip' || currentUser.role === 'admin');
  if (currentUser) {
    openAuthBtn?.classList.add('hidden');
    profileRoot?.classList.remove('hidden');
    profileEmail.textContent = currentUser.email;
    profileRole.textContent = currentUser.role || 'user';
    profileInitial.textContent = currentUser.email[0].toUpperCase();
    adminPanelLink?.classList.toggle('hidden', currentUser.role !== 'admin');
    toggleVipCards(isVip);
    applyCurrentFilter();
    loadRequestStatus().then(updateRequestAreas);
  } else {
    openAuthBtn?.classList.remove('hidden');
    profileRoot?.classList.add('hidden');
    toggleVipCards(false);
  }
  // VIP dashboard
  var dash = document.getElementById('vip-dashboard');
  if (dash) dash.classList.toggle('hidden', !isVip);
  // Theme selector
  var themeSel = document.getElementById('theme-selector');
  if (themeSel) themeSel.classList.remove('hidden');
  // Restrict themes for non-VIP
  var isVipUser = currentUser && (currentUser.role === 'vip' || currentUser.role === 'admin');
  document.querySelectorAll('.theme-dropdown .theme-opt').forEach(function(btn) {
    var theme = btn.dataset.theme;
    if (theme === 'hacker' || theme === 'ios') {
      btn.style.display = isVipUser ? '' : 'none';
    }
  });
  // Restrict MC versions for non-VIP
  var mcSel = document.querySelector('.mc-global-select');
  if (mcSel) {
    var opt20 = mcSel.querySelector('option[value="1.20.1"]');
    if (opt20) opt20.style.display = isVipUser ? '' : 'none';
    if (!isVipUser && mcSel.value === '1.20.1') {
      mcSel.value = '1.21.1';
    }
  }
  syncDownloadGates();
  if (mcSel) changeGlobalMc(mcSel);
}

adminPanelLink?.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentUser?.role === 'admin') {
    adminModal?.classList.remove('hidden');
    profileMenu?.classList.add('hidden');
    loadAdminData();
    startAdminPolling();
  }
});

document.getElementById('profile-manage-btn')?.addEventListener('click', () => {
  profileMenu?.classList.add('hidden');
  if (currentUser?.role === 'admin') {
    adminModal?.classList.remove('hidden');
    loadAdminData();
    startAdminPolling();
  } else {
    document.getElementById('profile-info-email').textContent = currentUser?.email || '—';
    const roleEl = document.getElementById('profile-info-role');
    roleEl.textContent = currentUser?.role || '—';
    roleEl.className = 'role-badge ' + (currentUser?.role || 'user');
    const vipEl = document.getElementById('profile-info-vip');
    if (currentUser?.vipUntil && Date.parse(currentUser.vipUntil) > Date.now()) {
      const d = Math.floor((Date.parse(currentUser.vipUntil) - Date.now()) / (1000 * 60 * 60 * 24));
      vipEl.textContent = d + ' дн.';
    } else {
      vipEl.textContent = '—';
    }
    document.getElementById('profile-status').textContent = 'Статус: готово.';
    document.getElementById('profile-status').style.color = '';
    document.getElementById('profile-modal')?.classList.remove('hidden');
    const vipSection = document.getElementById('profile-vip-section');
    if (vipSection) {
      vipSection.classList.toggle('hidden', currentUser?.role !== 'vip' && currentUser?.role !== 'admin');
    }
    const redeemSection = document.getElementById('profile-redeem-section');
    if (redeemSection) {
      redeemSection.classList.toggle('hidden', currentUser?.role === 'admin');
    }
  }
});

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyCurrentFilter();
  });
});

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.textContent.replace(/[\d]/g, '').trim() || '%';
    const dur = 2000;
    const start = performance.now();
    function update(now) {
      const t = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(t * target) + suffix;
      if (t < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

function revealOnScroll() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('show'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      } else if (entry.boundingClientRect.top < window.innerHeight) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => observer.observe(el));
}

revealOnScroll();
setTimeout(animateCounters, 600);

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
    const target = document.getElementById('admin-' + tab.dataset.tab + '-tab');
    if (target) target.classList.remove('hidden');
    loadAdminData();
  });
});

async function callAdminAPI(type, body) {
  var token = getSessionToken();
  if (!token) throw new Error('No session token');
  var method = body ? 'POST' : 'GET';
  var url = AUTH_CONFIG.url + '/functions/v1/admin-data?type=' + encodeURIComponent(type);
  var opts = { method: method, headers: { Authorization: 'Bearer ' + token } };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  var resp = await fetch(url, opts);
  var result = await resp.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}

function renderPromoCodes(data, list) {
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет ключей доступа</p>';
    return;
  }
  list.innerHTML = data.map(function(c) {
    var used = c.used_by ? '(использован)' : '';
    var modLabel = c.mod_name ? c.mod_name.replace('Ballistics Calculator (', '').replace(')', '') + ' ' + (c.mc_version || '') : '';
    return '<div class="promo-item ' + (c.is_used ? 'used' : '') + '">' +
      '<code>' + c.code + '</code>' +
      '<span style="font-size:0.7rem;color:var(--text-dim)">' + escapeHtml(modLabel) + '</span>' +
      '<span>' + (c.duration_hours ? c.duration_hours + 'ч' : '∞') + ' ' + used + '</span>' +
      '</div>';
  }).join('');
}

async function loadAdminData() {
  var status = document.getElementById('admin-status');
  try {
    await withTimeout(Promise.all([loadPromoCodes(), loadUsers(), loadVIPList(), loadRequests()]), 30000);
    if (status) { status.textContent = 'Статус: данные загружены.'; status.style.color = '#4ade80'; }
  } catch (_) {
    if (status) { status.textContent = 'Статус: ошибка загрузки данных.'; status.style.color = '#ff7b72'; }
  }
}

async function raceAdminLoad(type, sbPromise) {
  var edgePromise = callAdminAPI(type).then(function(d) {
    if (!d || (Array.isArray(d) && d.length === 0)) throw new Error('empty');
    return d;
  });
  var promises = [withTimeout(edgePromise, 5000)];
  if (sbPromise) {
    promises.push(
      withTimeout(sbPromise, 12000).then(function(r) {
        if (r.error) throw new Error(r.error.message || 'DB error');
        return r.data;
      })
    );
  }
  var results = await Promise.allSettled(promises);
  for (var r of results) {
    if (r.status === 'fulfilled' && r.value) return r.value;
  }
  // All failed — показываем первую ошибку
  var first = results.find(function(r) { return r.status === 'rejected'; });
  throw first?.reason || new Error('Нет данных');
}

async function loadPromoCodes() {
  var list = document.getElementById('promo-list');
  if (!list) return;
  try {
    var data = await raceAdminLoad('promo', sb ? sb.from('access_keys').select('*').order('created_at', { ascending: false }) : null);
    renderPromoCodes(data, list);
  } catch (e) {
    list.innerHTML = '<p style="color:#ff7b72">' + (e.message || 'Ошибка') + '</p>';
  }
}

document.getElementById('promo-generate-btn')?.addEventListener('click', async () => {
  const duration = parseInt(document.getElementById('promo-duration')?.value || '0');
  const modName = document.getElementById('promo-mod-name')?.value || 'Ballistics Calculator (Fabric)';
  const mcVersion = document.getElementById('promo-mc-version')?.value || '1.20.1';
  const result = document.getElementById('promo-result');
  try {
    var res = await callAdminAPI('create_promo', { duration_hours: duration, mod_name: modName, mc_version: mcVersion });
    if (result) {
      result.innerHTML = '<div class="promo-code-display">' +
        '<span class="promo-code">' + res.code + '</span>' +
        '<button class="btn primary" onclick="navigator.clipboard.writeText(\'' + res.code + '\')">Копировать</button>' +
        '</div>';
    }
  } catch (e) {
    if (!sb) { if (result) result.innerHTML = '<p style="color:#ff7b72">Ошибка: ' + e.message + '</p>'; return; }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
    var mcVer = mcVersion;
    if (modName === 'Injector') mcVer = 'any';
    const { error } = await sb.from('access_keys').insert({
      code, mod_name: modName, mc_version: mcVer,
      duration_hours: duration, created_by: currentSession?.user?.id || null
    });
    if (error) { if (result) result.innerHTML = '<p style="color:#ff7b72">Ошибка: ' + error.message + '</p>'; return; }
    if (result) {
      result.innerHTML = '<div class="promo-code-display">' +
        '<span class="promo-code">' + code + '</span>' +
        '<button class="btn primary" onclick="navigator.clipboard.writeText(\'' + code + '\')">Копировать</button>' +
        '</div>';
    }
  }
  loadPromoCodes();
});

function renderUsersList(data, list) {
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет пользователей</p>';
    return;
  }
  var durOpts = [
    [1, '1ч'],[6, '6ч'],[12, '12ч'],[24, '1д'],[72, '3д'],
    [168, '7д'],[336, '14д'],[720, '30д'],[2160, '90д'],[0, '∞']
  ];
  var durHtml = durOpts.map(function(d) {
    return '<option value="' + d[0] + '">' + d[1] + '</option>';
  }).join('');
  list.innerHTML = data.map(function(u) {
    var roleHtml = u.role === 'admin'
      ? '<span class="role-badge admin">admin</span>'
      : u.role === 'vip'
        ? '<span class="role-badge vip">vip</span>'
        : '<span class="role-badge user">user</span>';
    return '<div class="user-item">' +
      '<span>' + (u.email || u.id) + '</span> ' + roleHtml + ' ' +
      '<select class="duration-select">' + durHtml + '</select>' +
      '<select onchange="changeUserRole(\'' + u.id + '\', this.value, this.previousElementSibling.value)" class="role-select">' +
      '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>user</option>' +
      '<option value="vip"' + (u.role === 'vip' ? ' selected' : '') + '>vip</option>' +
      '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>' +
      '</select>' +
      '<button class="req-btn deny" onclick="deleteUser(\'' + u.id + '\', \'' + escapeHtmlAttr(u.email || '') + '\')" style="font-size:0.7rem;padding:0.3rem 0.6rem">Удалить</button>' +
      '</div>';
  }).join('');
}

async function loadUsers() {
  var list = document.getElementById('users-list');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-dim)">Загрузка...</p>';
  try {
    var data = await raceAdminLoad('users', sb ? sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(50) : null);
    renderUsersList(data, list);
  } catch (e) {
    list.innerHTML = '<p style="color:#ff7b72">' + (e.message || 'Ошибка') + '</p>';
  }
}

window.changeUserRole = async function(userId, newRole, durHours) {
  try {
    await callAdminAPI('change_role', { user_id: userId, role: newRole, dur_hours: parseInt(durHours) || 720 });
  } catch (e) {
    if (!sb) { document.getElementById('admin-status').textContent = 'Ошибка: ' + e.message; return; }
    var { error } = await sb.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { console.error('changeUserRole error:', error); return; }
    if (newRole === 'vip') {
      var hours = parseInt(durHours) || 720;
      await sb.from('vip_subscriptions').insert({
        user_id: userId, start_time: new Date().toISOString(),
        end_time: hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : '2999-12-31T23:59:59Z',
        is_active: true
      });
    } else if (newRole !== 'vip') {
      await sb.from('vip_subscriptions').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
    }
  }
  loadUsers();
  if (currentSession?.user?.id === userId) {
    await loadSession();
    updateUI();
  }
};

async function loadVIPList() {
  var list = document.getElementById('vip-list');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-dim)">Загрузка...</p>';
  try {
    var result = await raceAdminLoad('vip', sb ? sb.from('profiles').select('id, email, role').or('role.eq.admin,role.eq.vip').limit(50) : null);
    // raceAdminLoad вернёт либо edge результат {profiles, subs}, либо массив profiles (fallback)
    var data = result.profiles || result || [];
    var subs = result.subs || [];
    if (!data || data.length === 0) {
      list.innerHTML = '<p style="color:var(--text-dim)">Нет активных VIP</p>';
      return;
    }
    var subMap = {};
    if (subs.length) {
      subs.forEach(function(s) { subMap[s.user_id] = s; });
    } else if (sb) {
      // Fallback: если subs пуст, пробуем подгрузить отдельно
      try {
        var { data: s2 } = await withTimeout(sb.from('vip_subscriptions').select('*').eq('is_active', true), 8000);
        if (s2) s2.forEach(function(s) { subMap[s.user_id] = s; });
      } catch (_) {}
    }
    list.innerHTML = data.map(function(u) {
      var sub = subMap[u.id];
      var remaining = sub ? Math.max(0, Math.floor((Date.parse(sub.end_time) - Date.now()) / (1000 * 60 * 60 * 24))) + 'д' : '∞';
      return '<div class="vip-item">' +
        '<span>' + u.email + '</span>' +
        '<span>' + u.role + '</span>' +
        '<span>Осталось: ' + remaining + '</span>' +
        '</div>';
    }).join('');
  } catch (e) {
    list.innerHTML = '<p style="color:#ff7b72">' + (e.message || 'Ошибка') + '</p>';
  }
}

async function loadRequests() {
  var list = document.getElementById('requests-list');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-dim)">Загрузка...</p>';
  var durOpts = [
    [1, '1ч'],[6, '6ч'],[12, '12ч'],[24, '1д'],[72, '3д'],
    [168, '7д'],[336, '14д'],[720, '30д'],[2160, '90д'],[0, '∞']
  ];
  var durHtml = durOpts.map(function(d) { return '<option value="' + d[0] + '">' + d[1] + '</option>'; }).join('');
  try {
    var data = await raceAdminLoad('requests', sb ? sb.from('download_requests').select('id, user_id, mod_name, mc_version, status, description, approved_promo_code, approved_promo_duration, created_at').order('created_at', { ascending: false }).limit(50) : null);
    renderRequestsHTML(data, list, durHtml);
  } catch (e) {
    list.innerHTML = '<p style="color:#ff7b72">' + (e.message || 'Ошибка') + '</p>';
  }
}

function escapeHtml(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function escapeHtmlAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.deleteUser = async function(userId, email) {
  if (!sb || !currentUser || currentUser.role !== 'admin') return;
  if (!confirm('Удалить пользователя ' + email + '? Это действие необратимо.')) return;
  if (!confirm('Точно удалить ' + email + '? Все данные будут стёрты.')) return;
  try {
    var resp = await fetch(AUTH_CONFIG.url + '/functions/v1/delete-user', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getSessionToken(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId })
    });
    var result = await resp.json();
    if (result.error) {
      document.getElementById('admin-status').textContent = 'Ошибка: ' + result.error;
      document.getElementById('admin-status').style.color = '#ff7b72';
      return;
    }
    document.getElementById('admin-status').textContent = 'Пользователь ' + email + ' удалён';
    document.getElementById('admin-status').style.color = '#4ade80';
    loadUsers();
  } catch (e) {
    document.getElementById('admin-status').textContent = 'Ошибка сети при удалении: ' + (e.message || e);
    document.getElementById('admin-status').style.color = '#ff7b72';
  }
};

async function approveRequest(reqId, durHours) {
  durHours = durHours || 24;
  var statusEl = document.getElementById('admin-status');
  try {
    var result = await callAdminAPI('approve_request', { req_id: reqId, dur_hours: durHours });
    if (statusEl) { statusEl.textContent = 'Одобрено! Промокод: ' + result.code + ' (' + result.hours + 'ч)'; statusEl.style.color = '#4ade80'; }
  } catch (e) {
    if (!sb) { if (statusEl) statusEl.textContent = 'Ошибка: ' + e.message; return; }
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var code = '';
    for (var i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
    try {
      var { data: reqRows } = await sb.from('download_requests').select('mod_name, mc_version').eq('id', reqId).limit(1);
      var reqRow = reqRows && reqRows.length > 0 ? reqRows[0] : null;
      if (reqRow) {
        var { error: keyErr } = await sb.from('access_keys').insert({
          code, mod_name: reqRow.mod_name, mc_version: reqRow.mc_version,
          duration_hours: durHours, created_by: currentSession?.user?.id || null
        });
        if (keyErr) { if (statusEl) { statusEl.textContent = 'Ошибка ключа: ' + keyErr.message; statusEl.style.color = '#ff7b72'; } return; }
      }
      var { error } = await sb.from('download_requests').update({ status: 'approved', reviewed_by: currentUser?.id, reviewed_at: new Date().toISOString(), approved_promo_code: code, approved_promo_duration: durHours }).eq('id', reqId);
      if (error) { if (statusEl) { statusEl.textContent = 'Ошибка: ' + error.message; statusEl.style.color = '#ff7b72'; } return; }
      if (statusEl) { statusEl.textContent = 'Одобрено! Ключ: ' + code + ' (' + durHours + 'ч)'; statusEl.style.color = '#4ade80'; }
    } catch (_) { if (statusEl) statusEl.textContent = 'Ошибка сети'; }
  }
  loadRequests();
}

async function denyRequest(reqId, reason) {
  var statusEl = document.getElementById('admin-status');
  try {
    await callAdminAPI('deny_request', { req_id: reqId, reason: reason || null });
    if (statusEl) { statusEl.textContent = 'Запрос отклонён'; statusEl.style.color = '#ff7b72'; }
  } catch (e) {
    if (!sb) { if (statusEl) statusEl.textContent = 'Ошибка: ' + e.message; return; }
    try {
      var { error } = await sb.from('download_requests').update({ status: 'denied', reviewed_by: currentUser?.id, reviewed_at: new Date().toISOString(), deny_reason: reason || null }).eq('id', reqId);
      if (error) { if (statusEl) { statusEl.textContent = 'Ошибка: ' + error.message; statusEl.style.color = '#ff7b72'; } return; }
    } catch (_) { if (statusEl) statusEl.textContent = 'Ошибка сети'; }
  }
  loadRequests();
}

(function() {
  var s = document.createElement('style');
  s.textContent = '.role-select,.duration-select{padding:0.3rem 0.5rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer}.duration-select{width:auto;min-width:55px}.promo-dur-select{padding:0.3rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer;font-size:0.75rem;width:100%}.beta-tag{display:inline-block;font-size:0.55rem;padding:0.1rem 0.4rem;border-radius:3px;background:rgba(255,107,107,0.2);color:#ff6b6b;border:1px solid rgba(255,107,107,0.3);margin-left:0.3rem;vertical-align:middle}.vip-mc-select{padding:0.2rem 0.4rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer;font-size:0.85rem}.vip-mc-row{display:flex;align-items:center;gap:0.5rem;margin:0.8rem 0;font-size:0.85rem}.vip-mc-row label{color:var(--text-dim);white-space:nowrap}.tag.neoforge{background:rgba(130,87,229,0.12);color:#9b7eed;border:1px solid rgba(130,87,229,0.3)}';
  document.head.appendChild(s);
})();

function isVip(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'vip') {
    if (user.vipUntil) return Date.parse(user.vipUntil) > Date.now();
    // Fallback: check via subscription
    return true;
  }
  return false;
}

var THEME_KEY = 'ballisticys_theme';

(async function() {
  var body = document.body;
  var loader = document.getElementById('page-loader');

  // Загружаем Supabase SDK динамически (таймаут 10 сек)
  try {
    await withTimeout(loadSupabaseSDK(), 10000);
  } catch (_) {}
  if (typeof supabase !== 'undefined') {
    initSupabase();
    setupAuthListener();
  }

  await loadSession();
  updateUI();
  if (currentUser) startUserPolling();
  // Инициализируем отображение кнопок и зон запросов
  var mcSel = document.querySelector('.mc-global-select');
  if (mcSel) changeGlobalMc(mcSel);

  // Прячем лоадер
  setTimeout(function() {
    if (loader) loader.classList.add('hidden');
  }, 300);

  document.getElementById('profile-change-pass-btn')?.addEventListener('click', async () => {
    const pass = document.getElementById('profile-new-pass').value;
    const confirm = document.getElementById('profile-confirm-pass').value;
    const status = document.getElementById('profile-status');
    if (!currentUser) { status.textContent = 'Ошибка: не авторизован'; status.style.color = '#ff7b72'; return; }
    if (pass.length < 8) { status.textContent = 'Минимум 8 символов'; status.style.color = '#ff7b72'; return; }
    if (pass !== confirm) { status.textContent = 'Пароли не совпадают'; status.style.color = '#ff7b72'; return; }
    if (!sb) { status.textContent = 'Ошибка: Supabase не настроен'; status.style.color = '#ff7b72'; return; }
    const { error } = await sb.auth.updateUser({ password: pass });
    if (error) { status.textContent = 'Ошибка: ' + error.message; status.style.color = '#ff7b72'; return; }
    status.textContent = 'Пароль изменён!'; status.style.color = '#4ade80';
    document.getElementById('profile-new-pass').value = '';
    document.getElementById('profile-confirm-pass').value = '';
  });

  document.getElementById('profile-gen-key-btn')?.addEventListener('click', async () => {
    if (!sb) return;
    const durationHours = parseInt(document.getElementById('access-key-duration')?.value) || 0;
    const modName = document.getElementById('profile-gen-mod-name')?.value || 'Ballistics Calculator (Fabric)';
    let mcVersion = document.getElementById('profile-gen-mc-version')?.value || '1.20.1';
    if (modName === 'Injector') mcVersion = 'any';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code, error;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = '';
      for (let i = 0; i < 16; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const result = await sb.from('access_keys').insert({
        code,
        mod_name: modName,
        mc_version: mcVersion,
        duration_hours: durationHours > 0 ? durationHours : null,
        created_by: currentSession?.user?.id || null
      });
      error = result.error;
      if (!error) break;
      if (!error.message?.includes('duplicate key')) break;
    }
    if (error) {
      document.getElementById('profile-status').textContent = 'Ошибка: ' + error.message;
      document.getElementById('profile-status').style.color = '#ff7b72';
      return;
    }
    const result = document.getElementById('profile-gen-key-result');
    const codeEl = document.getElementById('profile-gen-key-code');
    if (result && codeEl) {
      codeEl.textContent = code;
      result.classList.remove('hidden');
    }
  });

  document.getElementById('profile-copy-key-btn')?.addEventListener('click', () => {
    const code = document.getElementById('profile-gen-key-code')?.textContent;
    if (code && code !== '—') navigator.clipboard.writeText(code);
  });

  document.getElementById('profile-redeem-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('profile-redeem-input');
    const status = document.getElementById('profile-status');
    const key = input?.value?.trim().toUpperCase();
    if (!key) { status.textContent = 'Введите ключ'; status.style.color = '#ff7b72'; return; }
    if (!sb || !currentSession) { status.textContent = 'Ошибка: не авторизован'; status.style.color = '#ff7b72'; return; }

    status.textContent = 'Проверка ключа...'; status.style.color = 'var(--text-dim)';

    const { data: keys, error: findError } = await sb.from('access_keys')
      .select('*')
      .eq('code', key)
      .eq('is_used', false)
      .limit(1);

    if (findError) { status.textContent = 'Ошибка: ' + findError.message; status.style.color = '#ff7b72'; return; }
    if (!keys || keys.length === 0) {
      status.textContent = 'Ключ не найден или уже использован'; status.style.color = '#ff7b72'; return;
    }

    const actKey = keys[0];
    const { error: useError } = await sb.from('access_keys')
      .update({ is_used: true, used_by: currentSession.user.id, used_at: new Date().toISOString() })
      .eq('id', actKey.id);

    if (useError) { status.textContent = 'Ошибка: ' + useError.message; status.style.color = '#ff7b72'; return; }

    const durHours = actKey.duration_hours;
    await sb.from('mod_access').insert({
      user_id: currentSession.user.id,
      mod_name: actKey.mod_name,
      mc_version: actKey.mc_version,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });

    const durText = !durHours ? 'навсегда' : (durHours >= 8760 ? '1 год' : durHours >= 720 ? '1 месяц' : durHours + ' ч');
    status.textContent = 'Доступ к моду активирован ' + durText + '!';
    status.style.color = '#3fb950';
    input.value = '';

    await loadSession();
    updateUI();
  });

  var isVipActive = isVip(currentUser);
  // Apply saved theme
  var savedTheme = localStorage.getItem(THEME_KEY) || '';
  if ((savedTheme === 'hacker' || savedTheme === 'ios') && currentUser && currentUser.role !== 'vip' && currentUser.role !== 'admin') {
    savedTheme = '';
    localStorage.setItem(THEME_KEY, '');
  }
  if (savedTheme) {
    body.classList.add('theme-' + savedTheme);
  }

  // ─── Dashboard Widget Logic ───
  (function initDashboard() {
    if (!isVipActive) return;

    // Matrix Rain canvas
    var c = document.createElement('canvas');
    c.id = 'matrix-rain';
    c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.15';
    document.body.insertBefore(c, document.body.firstChild);
    var ctx = c.getContext('2d');
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    var cols = Math.floor(c.width / 14);
    var drops = Array(cols).fill(1);
    var chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
    function drawMatrix() {
      ctx.fillStyle = 'rgba(5,8,5,0.05)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#00ff41';
      ctx.font = '13px monospace';
      for (var i = 0; i < drops.length; i++) {
        var text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 14, drops[i] * 14);
        if (drops[i] * 14 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    setInterval(drawMatrix, 50);

    // Clock
    function updateClock() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2,'0');
      var m = String(now.getMinutes()).padStart(2,'0');
      var s = String(now.getSeconds()).padStart(2,'0');
      var el = document.getElementById('clock-time');
      if (el) el.textContent = h+':'+m+':'+s;
      var d = document.getElementById('clock-date');
      if (d) d.textContent = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Uptime (from page load)
    var pageStart = Date.now();
    function updateUptime() {
      var diff = Date.now() - pageStart;
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var el = document.getElementById('clock-uptime');
      if (el) el.textContent = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    }
    updateUptime();
    setInterval(updateUptime, 1000);

    // Terminal — rotating messages
    var termMsgs = [
      '[+] Scanning network nodes...',
      '[+] 4 hosts discovered — filtering...',
      '[+] Target acquired: 0.0.0.0:443',
      '[+] Handshake: SHA-256 fingerprint OK',
      '[+] Encrypted tunnel: ESTABLISHED',
      '[+] Ballistic engine: CALIBRATED',
      '[+] PVO module: SYNCHRONIZED',
      '[+] Telemetry feed: ACTIVE',
      '[+] All systems nominal. Awaiting input.'
    ];
    var termIdx = 0;
    var termTail = document.getElementById('term-tail');
    if (termTail) {
      setInterval(function() {
        termTail.textContent = termMsgs[termIdx % termMsgs.length];
        termTail.style.opacity = '0';
        setTimeout(function() { termTail.style.opacity = '1'; }, 50);
        termIdx++;
      }, 3000);
    }

    // Network monitor — fake traffic
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function netUpdate() {
      var inEl = document.getElementById('net-in');
      var outEl = document.getElementById('net-out');
      var ppsEl = document.getElementById('net-pps');
      var inVal = document.getElementById('net-in-val');
      var outVal = document.getElementById('net-out-val');
      var ppsVal = document.getElementById('net-pps-val');
      if (inEl) { var iw = rand(20,85); inEl.style.width = iw+'%'; }
      if (outEl) { var ow = rand(10,60); outEl.style.width = ow+'%'; }
      if (ppsEl) { var pw = rand(30,90); ppsEl.style.width = pw+'%'; }
      if (inVal) inVal.textContent = (Math.random() * 4 + 0.5).toFixed(1)+' MB/s';
      if (outVal) outVal.textContent = (Math.random() * 2 + 0.2).toFixed(1)+' MB/s';
      if (ppsVal) ppsVal.textContent = rand(100,600)+' pkts/s';
    }
    netUpdate();
    setInterval(netUpdate, 2500);
  })();

  window.setTheme = function(theme) {
    body.className = body.className.replace(/theme-\S+/g, '').trim();
    if (theme) {
      if ((theme === 'hacker' || theme === 'ios') && currentUser && currentUser.role !== 'vip' && currentUser.role !== 'admin') {
        theme = '';
      }
      body.classList.add('theme-' + theme);
    }
    localStorage.setItem(THEME_KEY, theme);
  };

  // Theme toggle dropdown
  var themeToggle = document.getElementById('theme-toggle-btn');
  var themeDropdown = document.getElementById('theme-dropdown');
  if (themeToggle && themeDropdown) {
    themeToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      themeDropdown.classList.toggle('hidden');
    });
    document.querySelectorAll('.theme-dropdown .theme-opt').forEach(function(btn) {
      btn.addEventListener('click', function() {
        window.setTheme(this.dataset.theme);
        themeDropdown.classList.add('hidden');
      });
    });
    document.addEventListener('click', function() {
      themeDropdown.classList.add('hidden');
    });
  }
})();

async function loadSession() {
  if (!sb) return;

  // Supabase сам восстанавливает сессию из storageKey при ините,
  // ждём getSession()
  let session = null;
  try {
    const { data } = await withTimeout(sb.auth.getSession(), 20000);
    session = data?.session || null;
  } catch (e) {}

  // Fallback: manual restore через setSession
  if (!session) {
    try {
      const saved = localStorage.getItem(SS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.access_token && parsed?.refresh_token) {
          const { data } = await withTimeout(sb.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token
          }), 20000);
          if (data?.session) {
            session = data.session;
          }
        }
      }
    } catch (e) {}
  }

  currentSession = session;
  if (currentSession) {
    // Сначала пробуем полный профиль с сервера
    try {
      const { data: profile } = await withTimeout(sb.from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single(), 15000);
      if (profile) {
        currentUser = { ...currentSession.user, ...profile };
      } else {
        currentUser = { ...currentSession.user, email: currentSession.user.email, role: 'user' };
      }
      const { data: subs } = await withTimeout(sb.from('vip_subscriptions')
        .select('end_time')
        .eq('user_id', currentSession.user.id)
        .eq('is_active', true)
        .gt('end_time', new Date().toISOString())
        .limit(1), 15000);
      currentUser.vipUntil = subs?.length ? subs[0].end_time : null;
      await loadRequestStatus().catch(function() {});
      checkForRequestResponses();
    } catch (_) {
      // Если сервер недоступен — используем кеш
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem(USER_KEY)); } catch(_) {}
      if (cached) { currentUser = cached; }
    }
    // Сохраняем кеш
    try { localStorage.setItem(USER_KEY, JSON.stringify(currentUser)); } catch(_) {}
  } else {
    currentUser = null;
  }
}

// === МОДАЛЬНАЯ СИСТЕМА ОТВЕТОВ НА ЗАПРОСЫ ===

var SEEN_REQUESTS_KEY = 'ballisticys_seen_requests';

function markRequestSeen(reqId) {
  try {
    var seen = JSON.parse(localStorage.getItem(SEEN_REQUESTS_KEY) || '{}');
    seen[reqId] = Date.now();
    localStorage.setItem(SEEN_REQUESTS_KEY, JSON.stringify(seen));
  } catch (_) {}
}

function isRequestNew(req) {
  try {
    var seen = JSON.parse(localStorage.getItem(SEEN_REQUESTS_KEY) || '{}');
    if (seen[req.id]) return false;
    var reviewedAt = Date.parse(req.reviewed_at);
    if (!reviewedAt) return false;
    return Date.now() - reviewedAt < 86400000; // в течение 24ч
  } catch (_) { return false; }
}

function checkForRequestResponses() {
  if (!requestCache || !currentUser || !sb) return;
  var pendingResponse = null;
  for (var i = 0; i < requestCache.length; i++) {
    var r = requestCache[i];
    if ((r.status === 'approved' || r.status === 'denied') && isRequestNew(r)) {
      pendingResponse = r;
      break;
    }
  }
  if (!pendingResponse) return;
  markRequestSeen(pendingResponse.id);
  currentResponseReq = pendingResponse;
  showResponseNotification(pendingResponse);
}

var currentResponseReq = null;

function showResponseNotification(req) {
  var modal = document.getElementById('request-response-modal');
  var title = document.getElementById('response-title');
  var text = document.getElementById('response-text');
  if (req.status === 'approved') {
    title.textContent = '✓ Ваш запрос обработан';
    text.textContent = 'Администратор одобрил ваш запрос. Нажмите «Далее», чтобы скачать мод.';
  } else {
    title.textContent = '✕ Вам пришёл ответ';
    text.textContent = 'Администратор рассмотрел ваш запрос. Нажмите «Продолжить», чтобы узнать подробности.';
  }
  var nextBtn = document.getElementById('response-next-btn');
  nextBtn.textContent = req.status === 'approved' ? 'Далее' : 'Продолжить';
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function showRequestResult(req) {
  document.getElementById('request-response-modal').classList.add('hidden');
  var modal = document.getElementById('request-result-modal');
  var approvedSection = document.getElementById('request-result-approved');
  var deniedSection = document.getElementById('request-result-denied');
  if (req.status === 'approved') {
    approvedSection.classList.remove('hidden');
    deniedSection.classList.add('hidden');
    var dur = req.approved_promo_duration || 0;
    document.getElementById('result-promo-code').textContent = req.approved_promo_code || '—';
    document.getElementById('result-promo-dur').textContent = dur ? dur + 'ч' : '∞';
    document.getElementById('result-dl-version').textContent = req.mc_version;
  } else {
    approvedSection.classList.add('hidden');
    deniedSection.classList.remove('hidden');
    var reasonEl = document.getElementById('result-deny-reason');
    reasonEl.textContent = req.deny_reason || 'Причина не указана';
    currentResponseReq = req;
  }
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function hideRequestResult() {
  document.getElementById('request-result-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  currentResponseReq = null;
}

function downloadApprovedVersion() {
  if (!currentResponseReq) return;
  downloadMod(currentResponseReq.mod_name, currentResponseReq.mc_version, null);
  try { localStorage.setItem('dl_used_' + currentResponseReq.id, '1'); } catch(_) {}
  hideRequestResult();
}

// === Event handlers for result modals ===
document.addEventListener('DOMContentLoaded', function() {
  // Response notification → next
  var nextBtn = document.getElementById('response-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (currentResponseReq) showRequestResult(currentResponseReq);
    });
  }

  // Result modal close
  var closeResult = document.getElementById('close-request-result');
  if (closeResult) {
    closeResult.addEventListener('click', function() { hideRequestResult(); if (currentResponseReq) { try { localStorage.setItem('dl_used_' + currentResponseReq.id, '1'); } catch(_) {} } });
  }
  var resultBackdrop = document.getElementById('request-result-backdrop');
  if (resultBackdrop) {
    resultBackdrop.addEventListener('click', function() { hideRequestResult(); if (currentResponseReq) { try { localStorage.setItem('dl_used_' + currentResponseReq.id, '1'); } catch(_) {} } });
  }

  // Download button in approved result
  var dlBtn = document.getElementById('result-dl-btn');
  if (dlBtn) {
    dlBtn.addEventListener('click', downloadApprovedVersion);
  }

  // Copy promo code
  var copyBtn = document.getElementById('result-copy-promo-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var code = document.getElementById('result-promo-code');
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.textContent);
      } else {
        var ta = document.createElement('textarea');
        ta.value = code.textContent;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      copyBtn.textContent = 'Скопировано!';
      setTimeout(function() { copyBtn.textContent = 'Копировать'; }, 2000);
    });
  }

  // Reapply button
  var reapplyBtn = document.getElementById('result-reapply-btn');
  if (reapplyBtn) {
    reapplyBtn.addEventListener('click', function() {
      hideRequestResult();
      if (currentResponseReq) {
        // Создать новый запрос для того же мода
        var mc = currentResponseReq.mc_version;
        var modName = currentResponseReq.mod_name;
        // Показать уведомление
        var selMc = document.querySelector('.mc-global-select');
        if (selMc) selMc.value = mc;
        changeGlobalMc(selMc);
        // Вызвать событие change
        if (selMc) {
          var evt = new Event('change');
          selMc.dispatchEvent(evt);
        }
      }
    });
  }

  // Appeal button
  var appealBtn = document.getElementById('result-appeal-btn');
  if (appealBtn) {
    appealBtn.addEventListener('click', function() {
      currentAppealReq = currentResponseReq;
      hideRequestResult();
      document.getElementById('appeal-desc').value = '';
      document.getElementById('appeal-status').textContent = 'Статус: ожидаем.';
      document.getElementById('request-appeal-modal').classList.remove('hidden');
      document.body.classList.add('modal-open');
    });
  }

  var currentAppealReq = null;

  // Appeal modal
  var closeAppeal = document.getElementById('close-request-appeal');
  if (closeAppeal) {
    closeAppeal.addEventListener('click', function() {
      document.getElementById('request-appeal-modal').classList.add('hidden');
      document.body.classList.remove('modal-open');
      currentAppealReq = null;
    });
  }
  var appealBackdrop = document.getElementById('request-appeal-backdrop');
  if (appealBackdrop) {
    appealBackdrop.addEventListener('click', function() {
      document.getElementById('request-appeal-modal').classList.add('hidden');
      document.body.classList.remove('modal-open');
      currentAppealReq = null;
    });
  }
  var appealCancel = document.getElementById('appeal-cancel-btn');
  if (appealCancel) {
    appealCancel.addEventListener('click', function() {
      document.getElementById('request-appeal-modal').classList.add('hidden');
      document.body.classList.remove('modal-open');
      currentAppealReq = null;
    });
  }
  var appealSubmit = document.getElementById('appeal-submit-btn');
  if (appealSubmit) {
    appealSubmit.addEventListener('click', function() {
      var desc = document.getElementById('appeal-desc');
      var statusEl = document.getElementById('appeal-status');
      if (!desc || !desc.value.trim()) {
        if (statusEl) { statusEl.textContent = 'Опишите ситуацию'; statusEl.style.color = '#ff7b72'; }
        return;
      }
      if (!currentAppealReq || !sb || !currentUser) {
        if (statusEl) { statusEl.textContent = 'Ошибка: войдите в аккаунт'; statusEl.style.color = '#ff7b72'; }
        return;
      }
      appealSubmit.disabled = true;
      appealSubmit.textContent = '⏳ Отправка...';
      sb.from('download_requests').insert({
        user_id: currentUser.id,
        mod_name: currentAppealReq.mod_name,
        mc_version: currentAppealReq.mc_version,
        status: 'pending',
        description: '[АПЕЛЛЯЦИЯ] ' + desc.value.trim()
      }).then(function(result) {
        if (result.error) {
          if (statusEl) { statusEl.textContent = 'Ошибка: ' + result.error.message; statusEl.style.color = '#ff7b72'; }
          appealSubmit.disabled = false;
          appealSubmit.textContent = 'Отправить';
          return;
        }
        document.getElementById('request-appeal-modal').classList.add('hidden');
        document.body.classList.remove('modal-open');
        if (statusEl) { statusEl.textContent = 'Апелляция отправлена'; statusEl.style.color = '#4ade80'; }
        loadRequestStatus().then(checkForRequestResponses, function() {});
        setTimeout(function() {
          if (statusEl) statusEl.textContent = 'Статус: ожидаем.';
        }, 3000);
      });
    });
  }

  // Response backdrop click = proceed to result
  var responseBackdrop = document.getElementById('request-response-backdrop');
  if (responseBackdrop) {
    responseBackdrop.addEventListener('click', function() {
      if (currentResponseReq) showRequestResult(currentResponseReq);
    });
  }
});

// === POLLING SYSTEM ===

var adminPollTimer = null;
var userPollTimer = null;

function startAdminPolling() {
  stopAdminPolling();
  adminPollTimer = setInterval(function() {
    if (adminModal?.classList.contains('hidden')) {
      stopAdminPolling();
      return;
    }
    loadRequests();
  }, 5000);
}

function stopAdminPolling() {
  if (adminPollTimer) { clearInterval(adminPollTimer); adminPollTimer = null; }
}

function startUserPolling() {
  stopUserPolling();
  userPollTimer = setInterval(function() {
    if (!currentUser || !sb) { return; }
    loadRequestStatus().then(checkForRequestResponses, function() {});
  }, 10000);
}

function stopUserPolling() {
  if (userPollTimer) { clearInterval(userPollTimer); userPollTimer = null; }
}

// Delegated click handler for download buttons
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.mc-dl');
  if (!btn) return;
  var mod = btn.dataset.mod;
  var mc = btn.dataset.mc;
  if (mod && mc) downloadMod(mod, mc, btn);
});
