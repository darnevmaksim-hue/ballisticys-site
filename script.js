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
  document.querySelectorAll('.mc-data, .mc-dl').forEach(function(el) {
    var show = el.dataset.mc === mc;
    if (show && el.dataset.vip === 'true' && !isVipUser) show = false;
    el.style.display = show ? '' : 'none';
  });
  applyCurrentFilter();
}

function initSupabase() {
  if (AUTH_CONFIG.url && AUTH_CONFIG.anonKey) {
    sb = supabase.createClient(AUTH_CONFIG.url, AUTH_CONFIG.anonKey);
  }
}

// На старте удаляем старые ключи Supabase, чтобы не было конфликта
try {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth-token') || key.includes('supabase'))) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(k => localStorage.removeItem(k));
} catch (_) {}

sb?.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
    try { localStorage.setItem(SS_KEY, JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, user: session.user })); } catch (_) {}
    currentSession = session;
  } else if (event === 'SIGNED_OUT') {
    try { localStorage.removeItem(SS_KEY); } catch (_) {}
    currentSession = null;
    currentUser = null;
  }
});

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
    try { localStorage.setItem(SS_KEY, JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, user: data.session.user })); } catch (_) {}
    await loadSession();
    updateUI();
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
  try { localStorage.setItem(SS_KEY, JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, user: data.session.user })); } catch (_) {}
  await loadSession();
  updateUI();
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

function toggleVipCards(show) {
  const hint = document.querySelector('.vip-hint');
  if (hint) hint.textContent = show ? 'Версии для 1.21.1 доступны только для VIP и Админов' : 'Версии для 1.21.1 доступны только для VIP и Админов';
  var sel = document.querySelector('.mc-global-select');
  if (!show && sel && sel.value === '1.21.1') {
    sel.value = '1.20.1';
    changeGlobalMc(sel);
  }
}

function applyCurrentFilter() {
  const active = document.querySelector('.filter.active');
  if (!active) return;
  const filter = active.dataset.filter;
  document.querySelectorAll('.mod-card').forEach(function(card) {
    var visibleData = card.querySelector('.mc-data:not([style*="none"])') || card.querySelector('ul:not(.mc-data)');
    var hasVisible = !!visibleData;
    if (hasVisible && filter !== 'all' && card.dataset.core !== filter) hasVisible = false;
    card.style.display = hasVisible ? '' : 'none';
  });
}

function updateUI() {
  if (currentUser) {
    openAuthBtn?.classList.add('hidden');
    profileRoot?.classList.remove('hidden');
    profileEmail.textContent = currentUser.email;
    profileRole.textContent = currentUser.role || 'user';
    profileInitial.textContent = currentUser.email[0].toUpperCase();
    adminPanelLink?.classList.toggle('hidden', currentUser.role !== 'admin');
    const isVip = currentUser.role === 'vip' || currentUser.role === 'admin';
    toggleVipCards(isVip);
    applyCurrentFilter();
  } else {
    openAuthBtn?.classList.remove('hidden');
    profileRoot?.classList.add('hidden');
    toggleVipCards(false);
  }
  // Применить выбор версии MC
  var sel = document.querySelector('.mc-global-select');
  if (sel) changeGlobalMc(sel);
}

adminPanelLink?.addEventListener('click', (e) => {
  e.preventDefault();
  if (currentUser?.role === 'admin') {
    adminModal?.classList.remove('hidden');
    profileMenu?.classList.add('hidden');
    loadAdminData();
  }
});

document.getElementById('profile-manage-btn')?.addEventListener('click', () => {
  profileMenu?.classList.add('hidden');
  if (currentUser?.role === 'admin') {
    adminModal?.classList.remove('hidden');
    loadAdminData();
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
      redeemSection.classList.toggle('hidden', currentUser?.role === 'vip' || currentUser?.role === 'admin');
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

async function loadAdminData() {
  await Promise.all([loadPromoCodes(), loadUsers(), loadVIPList()]);
}

async function loadPromoCodes() {
  const list = document.getElementById('promo-list');
  if (!list || !sb) return;
  list.innerHTML = '<p style="color:var(--text-dim)">Загрузка...</p>';
  const { data, error } = await sb.from('promo_codes').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = '<p style="color:#ff7b72">Ошибка: ' + error.message + '</p>'; return; }
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет промокодов</p>';
    return;
  }
  list.innerHTML = data.map(c => {
    const used = c.used_by ? '(использован)' : '';
    return '<div class="promo-item ' + (c.is_used ? 'used' : '') + '">' +
      '<code>' + c.code + '</code>' +
      '<span>' + (c.duration_hours || 0) + 'ч ' + used + '</span>' +
      '</div>';
  }).join('');
}

document.getElementById('promo-generate-btn')?.addEventListener('click', async () => {
  const duration = parseInt(document.getElementById('promo-duration')?.value || '0');
  if (!sb) return;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const { error } = await sb.from('promo_codes').insert({
    code,
    duration_hours: duration,
    created_by: currentSession?.user?.id || null
  });
  if (error) {
    document.getElementById('promo-result').innerHTML = '<p style="color:#ff7b72">Ошибка: ' + error.message + '</p>';
    return;
  }
  const result = document.getElementById('promo-result');
  if (result) {
    result.innerHTML = '<div class="promo-code-display">' +
      '<span class="promo-code">' + code + '</span>' +
      '<button class="btn primary" onclick="navigator.clipboard.writeText(\'' + code + '\')">Копировать</button>' +
      '</div>';
  }
  loadPromoCodes();
});

async function loadUsers() {
  const list = document.getElementById('users-list');
  if (!list || !sb) return;
  list.innerHTML = '<p style="color:var(--text-dim)">Загрузка...</p>';
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = '<p style="color:#ff7b72">Ошибка: ' + error.message + '</p>'; return; }
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет пользователей</p>';
    return;
  }
  list.innerHTML = data.map(function(u) {
    const roleHtml = u.role === 'admin'
      ? '<span class="role-badge admin">admin</span>'
      : u.role === 'vip'
        ? '<span class="role-badge vip">vip</span>'
        : '<span class="role-badge user">user</span>';
    const durOpts = [
      [1, '1ч'],[6, '6ч'],[12, '12ч'],[24, '1д'],[72, '3д'],
      [168, '7д'],[336, '14д'],[720, '30д'],[2160, '90д'],[0, '∞']
    ];
    const durHtml = durOpts.map(function(d) {
      return '<option value="' + d[0] + '">' + d[1] + '</option>';
    }).join('');
    return '<div class="user-item">' +
      '<span>' + (u.email || u.id) + '</span> ' + roleHtml + ' ' +
      '<select class="duration-select">' + durHtml + '</select>' +
      '<select onchange="changeUserRole(\'' + u.id + '\', this.value, this.previousElementSibling.value)" class="role-select">' +
      '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>user</option>' +
      '<option value="vip"' + (u.role === 'vip' ? ' selected' : '') + '>vip</option>' +
      '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>' +
      '</select></div>';
  }).join('');
}

window.changeUserRole = async function(userId, newRole, durHours) {
  if (!sb) return;
  const { error } = await sb.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) { console.error('changeUserRole error:', error); return; }
  if (newRole === 'vip') {
    const hours = parseInt(durHours) || 720;
    await sb.from('vip_subscriptions').insert({
      user_id: userId,
      start_time: new Date().toISOString(),
      end_time: hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : '2999-12-31T23:59:59Z',
      is_active: true
    });
  } else if (newRole !== 'vip') {
    await sb.from('vip_subscriptions').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
  }
  loadUsers();
  if (currentSession?.user?.id === userId) {
    await loadSession();
    updateUI();
  }
};

async function loadVIPList() {
  const list = document.getElementById('vip-list');
  if (!list || !sb) return;
  list.innerHTML = '<p style="color:var(--text-dim)">Загрузка...</p>';
  const { data, error } = await sb.from('profiles').select('id, email, role').or('role.eq.admin,role.eq.vip');
  if (error) { list.innerHTML = '<p style="color:#ff7b72">Ошибка: ' + error.message + '</p>'; return; }
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет активных VIP</p>';
    return;
  }
  const subscriptions = await sb.from('vip_subscriptions').select('*').eq('is_active', true);
  const subMap = {};
  if (subscriptions.data) {
    subscriptions.data.forEach(s => { subMap[s.user_id] = s; });
  }
  list.innerHTML = data.map(function(u) {
    const sub = subMap[u.id];
    const remaining = sub ? Math.max(0, Math.floor((Date.parse(sub.end_time) - Date.now()) / (1000 * 60 * 60 * 24))) + 'д' : '∞';
    return '<div class="vip-item">' +
      '<span>' + u.email + '</span>' +
      '<span>' + u.role + '</span>' +
      '<span>Осталось: ' + remaining + '</span>' +
      '</div>';
  }).join('');
}

(function() {
  var s = document.createElement('style');
  s.textContent = '.role-select,.duration-select{padding:0.3rem 0.5rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer}.duration-select{width:auto;min-width:55px}.beta-tag{display:inline-block;font-size:0.55rem;padding:0.1rem 0.4rem;border-radius:3px;background:rgba(255,107,107,0.2);color:#ff6b6b;border:1px solid rgba(255,107,107,0.3);margin-left:0.3rem;vertical-align:middle}.vip-mc-select{padding:0.2rem 0.4rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer;font-size:0.85rem}.vip-mc-row{display:flex;align-items:center;gap:0.5rem;margin:0.8rem 0;font-size:0.85rem}.vip-mc-row label{color:var(--text-dim);white-space:nowrap}.tag.neoforge{background:rgba(130,87,229,0.12);color:#9b7eed;border:1px solid rgba(130,87,229,0.3)}';
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

var VIP_THEME_KEY = 'ballisticys_vip_theme';

(async function() {
  var body = document.body;
  var loader = document.getElementById('page-loader');

  // Загружаем Supabase SDK динамически (таймаут 10 сек)
  try {
    await withTimeout(loadSupabaseSDK(), 10000);
  } catch (_) {}
  if (typeof supabase !== 'undefined') {
    initSupabase();
  }

  await loadSession();
  updateUI();

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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const { error } = await sb.from('promo_codes').insert({
      code,
      duration_hours: 24,
      created_by: currentSession?.user?.id || null
    });
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

    const { data: codes, error: findError } = await sb.from('promo_codes')
      .select('*')
      .eq('code', key)
      .eq('is_used', false)
      .limit(1);

    if (findError) { status.textContent = 'Ошибка: ' + findError.message; status.style.color = '#ff7b72'; return; }
    if (!codes || codes.length === 0) {
      status.textContent = 'Ключ не найден или уже использован'; status.style.color = '#ff7b72'; return;
    }

    const promo = codes[0];
    const { error: useError } = await sb.from('promo_codes')
      .update({ is_used: true, used_by: currentSession.user.id, used_at: new Date().toISOString() })
      .eq('id', promo.id);

    if (useError) { status.textContent = 'Ошибка: ' + useError.message; status.style.color = '#ff7b72'; return; }

    await sb.from('vip_subscriptions').insert({
      user_id: currentSession.user.id,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + (promo.duration_hours || 24) * 60 * 60 * 1000).toISOString(),
      is_active: true
    });

    const { error: roleError } = await sb.from('profiles')
      .update({ role: 'vip' })
      .eq('id', currentSession.user.id);

    if (roleError) { status.textContent = 'Ошибка: ' + roleError.message; status.style.color = '#ff7b72'; return; }

    status.textContent = 'VIP-статус активирован на ' + (promo.duration_hours || 24) + ' ч!';
    status.style.color = '#ffd700';
    input.value = '';

    await loadSession();
    updateUI();
  });

  var isVipActive = isVip(currentUser);
  if (isVipActive && localStorage.getItem(VIP_THEME_KEY) !== '0') {
    body.classList.add('vip-theme');
  }
  var st = document.createElement('style');
  st.textContent = `/* ─── VIP HACKER THEME ─── */
body.vip-theme {
  --neon: #00ff41; --cyan: #0ff; --pink: #f0f;
  --vip-bg: #050805; --vip-card: rgba(0,255,65,0.04);
  --vip-border: rgba(0,255,65,0.18);
  --vip-text: #b0ffb0;
  --font-main: 'JetBrains Mono', monospace;
  background: var(--vip-bg) !important;
}
/* Scanlines overlay */
body.vip-theme::after {
  content: ''; position: fixed; inset: 0; z-index: 9998;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px);
}
body.vip-theme .background-grid {
  background-image: linear-gradient(rgba(0,255,65,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.07) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 12s linear infinite;
}
@keyframes gridMove { 0% { transform: translate(0,0); } 100% { transform: translate(50px,50px); } }
/* Glitch text */
@keyframes glitch {
  0%,90%,100% { transform: translate(0); }
  92% { transform: translate(-2px,1px) skewX(-1deg); }
  94% { transform: translate(2px,-1px) skewX(1deg); }
  96% { transform: translate(-1px,2px); }
  98% { transform: translate(1px,-2px) skewX(-0.5deg); }
}
body.vip-theme .hero-copy h1 {
  color: var(--neon); font-family: var(--font-main);
  text-shadow: 0 0 7px var(--neon), 0 0 20px rgba(0,255,65,0.3), 0 0 40px rgba(0,255,65,0.1);
  animation: glitch 4s infinite;
}
body.vip-theme .hero-copy h1::before { content: '>_ '; color: var(--cyan); text-shadow: 0 0 10px var(--cyan); font-size: 0.7em; }
body.vip-theme .top-note { color: var(--neon) !important; }
body.vip-theme .top-note::after { content: ' _'; animation: blink 1s step-end infinite; }
body.vip-theme .hero-sub { border-left: 2px solid var(--neon); padding-left: 1rem; color: rgba(0,255,65,0.5) !important; }
body.vip-theme .panel {
  background: rgba(0,8,0,0.85);
  border: 1px solid var(--vip-border);
  box-shadow: 0 0 20px rgba(0,255,65,0.05), inset 0 0 40px rgba(0,255,65,0.02);
  backdrop-filter: blur(4px);
  position: relative;
}
body.vip-theme .panel::before {
  content: ''; position: absolute; top: -1px; left: -1px; right: -1px; height: 2px;
  background: linear-gradient(90deg, transparent, var(--neon), transparent);
  animation: barSweep 4s ease-in-out infinite;
}
@keyframes barSweep { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
body.vip-theme .panel h2 { color: var(--cyan); text-shadow: 0 0 15px rgba(0,255,255,0.3); }
body.vip-theme .panel h2::before { content: '# '; color: var(--neon); }
body.vip-theme .telemetry-card {
  background: rgba(0,20,0,0.5);
  border-color: rgba(0,255,65,0.1);
}
body.vip-theme .metric-title::before { content: '> '; color: var(--neon); }
body.vip-theme .metric-value { color: var(--neon); text-shadow: 0 0 15px rgba(0,255,65,0.4); }
body.vip-theme .metric-value::after { content: ' Hz'; font-size: 0.4em; color: rgba(0,255,65,0.3); }
body.vip-theme .sparkline polyline { stroke: var(--neon); filter: drop-shadow(0 0 4px rgba(0,255,65,0.4)); }
body.vip-theme .stage-card .num { color: var(--cyan); text-shadow: 0 0 10px var(--cyan); opacity: 0.4; }
body.vip-theme .stage-card h3 { color: var(--neon); }
body.vip-theme .mod-card { background: rgba(0,10,0,0.5); border-color: rgba(0,255,65,0.08); }
body.vip-theme .mod-card:hover { border-color: rgba(0,255,65,0.3); box-shadow: 0 0 25px rgba(0,255,65,0.1); }
body.vip-theme .vip-card {
  background: rgba(0,20,0,0.4) !important;
  border: 1px solid rgba(0,255,65,0.2) !important;
  position: relative; overflow: hidden;
}
body.vip-theme .vip-card::before {
  content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--neon), transparent);
  animation: beam 3s ease-in-out infinite;
}
@keyframes beam { 0% { left: -60%; } 100% { left: 160%; } }
body.vip-theme .tag.fabric { background: rgba(0,255,65,0.12); color: var(--neon); border-color: rgba(0,255,65,0.3); }
body.vip-theme .tag.forge { background: rgba(0,255,255,0.12); color: var(--cyan); border-color: rgba(0,255,255,0.3); }
body.vip-theme .tag.neoforge { background: rgba(130,87,229,0.12); color: #9b7eed; border-color: rgba(130,87,229,0.3); }
body.vip-theme .tag.injector { background: rgba(255,0,255,0.12); color: var(--pink); border-color: rgba(255,0,255,0.3); }
body.vip-theme .btn.primary {
  background: transparent; border: 1px solid var(--neon); color: var(--neon);
  text-shadow: 0 0 5px rgba(0,255,65,0.3);
  box-shadow: 0 0 10px rgba(0,255,65,0.1), inset 0 0 10px rgba(0,255,65,0.05);
  transition: all 0.2s;
}
body.vip-theme .btn.primary:hover { background: rgba(0,255,65,0.1); box-shadow: 0 0 25px rgba(0,255,65,0.3); transform: translateY(-2px); }
body.vip-theme .btn.ghost { border-color: rgba(0,255,65,0.15); color: rgba(0,255,65,0.5); }
body.vip-theme .filter.active { background: rgba(0,255,65,0.12); border-color: var(--neon); color: var(--neon); }
body.vip-theme .filter { border-color: rgba(0,255,65,0.1); color: rgba(0,255,65,0.3); }
body.vip-theme .chips span { background: rgba(0,255,65,0.06); border-color: rgba(0,255,65,0.12); color: var(--neon); }
body.vip-theme .chips span::before { content: '\\\\ '; }
body.vip-theme .vip-badge {
  background: rgba(0,255,65,0.12); color: var(--neon); border: 1px solid rgba(0,255,65,0.3);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { box-shadow: 0 0 5px rgba(0,255,65,0.2); } 50% { box-shadow: 0 0 15px rgba(0,255,65,0.5); } }
body.vip-theme .profile-trigger { background: linear-gradient(135deg, #003300, var(--neon)); border-color: var(--neon); box-shadow: 0 0 15px rgba(0,255,65,0.3); }
body.vip-theme .profile-menu { background: rgba(0,8,0,0.95); border-color: var(--vip-border); backdrop-filter: blur(10px); }
body.vip-theme .profile-menu-btn:hover { border-color: var(--neon); background: rgba(0,255,65,0.05); }
body.vip-theme .role-badge.vip { background: rgba(0,255,65,0.12); color: var(--neon); border-color: rgba(0,255,65,0.2); }
body.vip-theme .role-badge.admin { background: rgba(255,0,255,0.12); color: var(--pink); border-color: rgba(255,0,255,0.2); }
body.vip-theme .footer { border-top: 1px solid rgba(0,255,65,0.06); color: rgba(0,255,65,0.2); }
body.vip-theme .footer::before { content: '> '; }
body.vip-theme .admin-tab.active { color: var(--neon); border-bottom-color: var(--neon); }
body.vip-theme .beta-tag {
  display: inline-block; font-size: 0.55rem; padding: 0.1rem 0.4rem; border-radius: 3px;
  background: rgba(255,0,255,0.15); color: var(--pink); border: 1px solid rgba(255,0,255,0.3);
  animation: blink 1.5s step-end infinite; margin-left: 0.3rem; vertical-align: middle;
}
body.vip-theme .vip-theme-btn { border-color: var(--neon); color: var(--neon); box-shadow: 0 0 8px rgba(0,255,65,0.2); }
body.vip-theme .mc-global-row label { color: var(--cyan); }
body.vip-theme .mc-global-select { background: rgba(0,10,0,0.8); border-color: rgba(0,255,65,0.2); color: var(--neon); }
body.vip-theme .vip-section { border-color: rgba(0,255,65,0.15); background: rgba(0,255,65,0.02); }
body.vip-theme .vip-section h3 { color: var(--neon); }
body.vip-theme .guide-grid article h3 { color: var(--cyan); }
body.vip-theme .guide-grid ol li::marker { color: var(--neon); }
body.vip-theme .promo-code { background: rgba(0,255,65,0.06); border-color: var(--neon); color: var(--neon); }
/* Dashboard */
body.vip-theme .vip-dashboard { display: block; }
.vip-dashboard { display: none; }
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.dash-widget {
  background: rgba(0,10,0,0.7); border: 1px solid rgba(0,255,65,0.2);
  border-radius: 4px; overflow: hidden;
  box-shadow: 0 0 15px rgba(0,255,65,0.05), inset 0 0 30px rgba(0,255,65,0.02);
}
.dash-widget-head {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.35rem 0.6rem; background: rgba(0,255,65,0.05);
  border-bottom: 1px solid rgba(0,255,65,0.1);
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--neon);
}
.dash-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.dash-dot.red { background: #ff5f56; } .dash-dot.yellow { background: #ffbd2e; } .dash-dot.green { background: #27c93f; }
.dash-title { flex: 1; text-align: center; }
.dash-widget-body { padding: 0.8rem; }
.term-line { font-size: 0.7rem; line-height: 1.5; font-family: 'JetBrains Mono', monospace; }
.term-prompt { color: var(--neon); } .term-cmd { color: #ccc; }
.term-output { color: var(--vip-text); }
.term-line:last-child .term-output::after { content: '▊'; animation: blink 1s step-end infinite; color: var(--neon); }
.clock-body { text-align: center; padding: 1.2rem 0.8rem; }
.clock-time {
  font-size: 2.8rem; font-weight: 600; font-family: 'JetBrains Mono', monospace;
  color: var(--neon); text-shadow: 0 0 25px rgba(0,255,65,0.4);
  line-height: 1; letter-spacing: 0.03em;
}
.clock-date { font-size: 0.9rem; color: var(--vip-text); font-family: 'JetBrains Mono', monospace; margin-top: 0.2rem; opacity: 0.7; }
.clock-uptime { font-size: 0.7rem; color: var(--cyan); font-family: 'JetBrains Mono', monospace; margin-top: 0.5rem; }
.clock-tz { font-size: 0.55rem; color: #666; margin-top: 0.2rem; }
.net-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; }
.net-label { width: 2.5rem; color: var(--cyan); font-weight: 600; }
.net-bar-wrap { flex: 1; height: 10px; background: rgba(0,255,65,0.05); border-radius: 5px; overflow: hidden; border: 1px solid rgba(0,255,65,0.08); }
.net-bar { height: 100%; border-radius: 5px; transition: width 0.6s ease; display: block; }
.net-in { background: linear-gradient(90deg, var(--neon), #00cc33); }
.net-out { background: linear-gradient(90deg, var(--cyan), #0099cc); }
.net-pps { background: linear-gradient(90deg, var(--pink), #9900cc); }
.net-val { width: 4.5rem; text-align: right; color: var(--vip-text); font-size: 0.65rem; }
.net-detail { font-size: 0.6rem; font-family: 'JetBrains Mono', monospace; color: #666; margin-top: 0.3rem; }
.net-detail-label { color: var(--cyan); margin-right: 0.4rem; }
.sec-body { text-align: center; padding: 1rem; }
.sec-lock { font-size: 2rem; margin-bottom: 0.2rem; filter: drop-shadow(0 0 10px var(--cyan)); }
.sec-status { font-size: 0.8rem; font-weight: 600; color: var(--neon); letter-spacing: 0.15em; text-shadow: 0 0 10px rgba(0,255,65,0.3); margin-bottom: 0.6rem; }
.sec-detail-row { display: flex; justify-content: space-between; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; padding: 0.15rem 0; border-bottom: 1px solid rgba(0,255,65,0.04); }
.sec-detail-label { color: #666; } .sec-detail-val { color: var(--vip-text); }
.sec-ok { color: var(--neon); }
.sec-badge { display: inline-block; font-size: 0.55rem; padding: 0.15rem 0.7rem; border: 1px solid var(--neon); border-radius: 8px; color: var(--neon); margin-top: 0.5rem; letter-spacing: 0.15em; animation: pulse 2s infinite; }
@media (max-width: 700px) { .dash-grid { grid-template-columns: 1fr; } .clock-time { font-size: 2rem; } }`;
  document.head.appendChild(st);

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
      '[+] Target acquired: 192.168.137.1:443',
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

  window.toggleVipTheme = function() {
    if (!isVip(currentUser)) return;
    body.classList.toggle('vip-theme');
    localStorage.setItem(VIP_THEME_KEY, body.classList.contains('vip-theme') ? '1' : '0');
  };

  if (isVipActive) {
    var themeBtn = document.getElementById('vip-theme-btn');
    if (themeBtn) {
      themeBtn.classList.remove('hidden');
      themeBtn.onclick = window.toggleVipTheme;
    }
  }
})();

async function loadSession() {
  if (!sb) return;

  // Пытаемся восстановить сессию (с таймаутом 20 сек)
  let session = null;
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
          try { localStorage.setItem(SS_KEY, JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, user: session.user })); } catch (_) {}
        }
      }
    }
  } catch (e) {
    // ignore
  }

  if (!session) {
    try { localStorage.removeItem(SS_KEY); localStorage.removeItem(USER_KEY); } catch (_) {}
    try {
      const { data } = await withTimeout(sb.auth.getSession(), 15000);
      session = data?.session || null;
    } catch (_) {}
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
