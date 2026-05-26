const AUTH_CONFIG = window.AUTH_CONFIG || {};
let sb = null;
if (AUTH_CONFIG.url && AUTH_CONFIG.anonKey) {
  sb = supabase.createClient(AUTH_CONFIG.url, AUTH_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage
    }
  });
}

let currentUser = null;
let currentSession = null;

sb?.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    currentSession = session;
  } else if (event === 'SIGNED_OUT') {
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

  if (!sb) {
    status.textContent = 'Ошибка: Supabase не настроен'; status.style.color = '#ff7b72'; return;
  }

  status.textContent = 'Вход...'; status.style.color = 'var(--text-dim)';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

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
  document.querySelectorAll('.vip-card').forEach(card => {
    card.classList.toggle('hidden', !show);
  });
  const hint = document.querySelector('.vip-hint');
  if (hint) hint.classList.toggle('hidden', !!show);
}

function applyCurrentFilter() {
  const active = document.querySelector('.filter.active');
  if (!active) return;
  const filter = active.dataset.filter;
  document.querySelectorAll('.mod-card').forEach(card => {
    if (card.classList.contains('vip-card') && card.classList.contains('hidden')) return;
    card.style.display = filter === 'all' || card.dataset.core === filter ? '' : 'none';
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
  s.textContent = '.role-select,.duration-select{padding:0.3rem 0.5rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer}.duration-select{width:auto;min-width:55px}.vip-version-row{display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;font-size:0.85rem}.vip-version-row label{color:var(--text-dim)}.vip-version-select{padding:0.3rem 0.5rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer;flex:1}.beta-tag{display:inline-block;font-size:0.55rem;padding:0.1rem 0.4rem;border-radius:3px;background:rgba(255,107,107,0.2);color:#ff6b6b;border:1px solid rgba(255,107,107,0.3);margin-left:0.3rem;vertical-align:middle}';
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
  await loadSession();
  updateUI();

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
  if (isVipActive && localStorage.getItem(VIP_THEME_KEY) === '1') {
    body.classList.add('vip-theme');
  }
  var st = document.createElement('style');
  st.textContent = `/* ─── HACKER VIP THEME ─── */
body.vip-theme {
  --neon-green: #00ff41;
  --neon-cyan: #00f0ff;
  --neon-pink: #ff00aa;
  --vip-bg: #0a0e0a;
  --vip-panel: rgba(0,20,0,0.85);
  --vip-border: rgba(0,255,65,0.25);
  --vip-text: #c9ffc9;
}
body.vip-theme {
  background: var(--vip-bg);
}
/* Скан-линии */
body.vip-theme::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,255,65,0.015) 2px,
    rgba(0,255,65,0.015) 4px
  );
}
/* Анимированная сетка */
body.vip-theme .background-grid {
  background-image:
    linear-gradient(rgba(0,255,65,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,65,0.06) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridScroll 8s linear infinite;
}
@keyframes gridScroll {
  0% { transform: translate(0,0); }
  100% { transform: translate(40px,40px); }
}
/* Парящие глифы (hex/ascii) */
body.vip-theme .hero::after {
  content: "\\{0x7F 0x4E 0x3A 0x91\\}\\n[ACCESS: GRANTED]\\n> USER: VIP\\n> MODE: OVERRIDE";
  position: absolute;
  right: 2rem;
  top: 15%;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: rgba(0,255,65,0.12);
  white-space: pre;
  text-align: right;
  line-height: 1.8;
  pointer-events: none;
}
/* Hero секция */
body.vip-theme .hero-copy h1 {
  font-family: var(--font-header);
  color: var(--neon-green);
  text-shadow:
    0 0 10px rgba(0,255,65,0.5),
    0 0 40px rgba(0,255,65,0.2),
    0 0 80px rgba(0,255,65,0.1);
  position: relative;
  display: inline-block;
}
body.vip-theme .hero-copy h1::before {
  content: '> ';
  color: var(--neon-cyan);
  text-shadow: 0 0 10px rgba(0,240,255,0.5);
}
body.vip-theme .hero-copy h1::after {
  content: '  [BETA]';
  font-size: 0.35em;
  color: var(--neon-pink);
  vertical-align: super;
  text-shadow: 0 0 20px rgba(255,0,170,0.6);
  animation: blink 1.5s step-end infinite;
}
@keyframes blink {
  0%,100% { opacity: 1; }
  50% { opacity: 0.3; }
}
body.vip-theme .top-note {
  color: var(--neon-green) !important;
  text-shadow: 0 0 10px rgba(0,255,65,0.3);
}
body.vip-theme .top-note::before { content: '> '; }
body.vip-theme .top-note::after {
  content: ' _';
  animation: blink 1s step-end infinite;
}
body.vip-theme .hero-sub {
  color: rgba(0,255,65,0.6) !important;
  border-left: 2px solid var(--neon-green);
  padding-left: 1rem;
}
/* Панели — терминальный стиль */
body.vip-theme .panel {
  background: var(--vip-panel);
  border: 1px solid var(--vip-border);
  box-shadow: 0 0 15px rgba(0,255,65,0.08), inset 0 0 30px rgba(0,255,65,0.02);
  backdrop-filter: blur(2px);
}
body.vip-theme .panel h2 {
  color: var(--neon-cyan);
  text-shadow: 0 0 15px rgba(0,240,255,0.3);
}
body.vip-theme .panel h2::before { content: '# '; color: var(--neon-green); }
/* Telemetry */
body.vip-theme .telemetry-card {
  background: rgba(0,20,0,0.6);
  border-color: rgba(0,255,65,0.15);
  box-shadow: inset 0 0 20px rgba(0,255,65,0.03);
}
body.vip-theme .metric-title {
  color: rgba(0,255,65,0.5);
}
body.vip-theme .metric-title::before { content: '> '; }
body.vip-theme .metric-value {
  color: var(--neon-green);
  text-shadow: 0 0 20px rgba(0,255,65,0.4);
}
body.vip-theme .metric-value::after {
  content: ' Hz';
  font-size: 0.4em;
  color: rgba(0,255,65,0.3);
}
body.vip-theme .sparkline {
  stroke: var(--neon-green);
  filter: drop-shadow(0 0 4px rgba(0,255,65,0.3));
}
/* Этапы */
body.vip-theme .stage-card .num {
  color: var(--neon-cyan);
  opacity: 0.5;
  text-shadow: 0 0 10px rgba(0,240,255,0.2);
}
body.vip-theme .stage-card h3 { color: var(--neon-green); }
/* Мод карточки */
body.vip-theme .mod-card {
  background: rgba(0,20,0,0.5);
  border-color: rgba(0,255,65,0.12);
}
body.vip-theme .mod-card:hover {
  border-color: rgba(0,255,65,0.35);
  box-shadow: 0 0 20px rgba(0,255,65,0.1);
}
body.vip-theme .vip-card {
  border-color: rgba(0,255,65,0.2) !important;
  background: rgba(0,30,0,0.5) !important;
  position: relative;
  overflow: hidden;
}
body.vip-theme .vip-card::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--neon-green), transparent);
  animation: scanLine 3s linear infinite;
}
@keyframes scanLine {
  0% { left: -100%; }
  100% { left: 100%; }
}
body.vip-theme .tag.fabric {
  background: rgba(0,255,65,0.15);
  color: var(--neon-green);
  border: 1px solid rgba(0,255,65,0.3);
}
body.vip-theme .tag.forge {
  background: rgba(0,240,255,0.15);
  color: var(--neon-cyan);
  border: 1px solid rgba(0,240,255,0.3);
}
body.vip-theme .tag.injector {
  background: rgba(255,0,170,0.15);
  color: var(--neon-pink);
  border: 1px solid rgba(255,0,170,0.3);
}
/* Кнопки */
body.vip-theme .btn.primary {
  background: transparent;
  border: 1px solid var(--neon-green);
  color: var(--neon-green);
  text-shadow: 0 0 5px rgba(0,255,65,0.3);
  box-shadow: 0 0 10px rgba(0,255,65,0.1);
}
body.vip-theme .btn.primary:hover {
  background: rgba(0,255,65,0.1);
  box-shadow: 0 0 20px rgba(0,255,65,0.3);
  transform: translateY(-2px);
}
body.vip-theme .btn.ghost {
  border-color: rgba(0,255,65,0.2);
  color: rgba(0,255,65,0.6);
}
/* Чипсы */
body.vip-theme .chips span {
  background: rgba(0,255,65,0.06);
  border-color: rgba(0,255,65,0.15);
  color: var(--neon-green);
}
body.vip-theme .chips span::before { content: '\\\\ '; font-size: 0.7em; }
/* Профиль */
body.vip-theme .profile-trigger {
  background: linear-gradient(135deg, #003300, #00ff41);
  border-color: var(--neon-green);
  box-shadow: 0 0 15px rgba(0,255,65,0.3);
  animation: none;
}
body.vip-theme .profile-menu {
  background: rgba(0,10,0,0.95);
  border-color: var(--vip-border);
  backdrop-filter: blur(10px);
}
body.vip-theme .profile-menu-btn:hover {
  border-color: var(--neon-green);
  background: rgba(0,255,65,0.05);
}
/* VIP badge */
body.vip-theme .vip-badge {
  background: rgba(0,255,65,0.15);
  color: var(--neon-green);
  border: 1px solid rgba(0,255,65,0.3);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%,100% { box-shadow: 0 0 5px rgba(0,255,65,0.2); }
  50% { box-shadow: 0 0 15px rgba(0,255,65,0.5); }
}
/* Чекбоксы/фильтры */
body.vip-theme .filter.active {
  background: rgba(0,255,65,0.15);
  border-color: var(--neon-green);
  color: var(--neon-green);
}
body.vip-theme .filter {
  border-color: rgba(0,255,65,0.15);
  color: rgba(0,255,65,0.4);
}
/* Гайд */
body.vip-theme .guide-grid article h3 { color: var(--neon-cyan); }
body.vip-theme .guide-grid ol li::marker { color: var(--neon-green); }
/* Футер */
body.vip-theme .footer {
  border-top: 1px solid rgba(0,255,65,0.08);
  color: rgba(0,255,65,0.3);
}
body.vip-theme .footer::before { content: '> '; }
/* Админка */
body.vip-theme .admin-tab.active {
  color: var(--neon-green);
  border-bottom-color: var(--neon-green);
}
body.vip-theme .role-badge.vip {
  background: rgba(0,255,65,0.15);
  color: var(--neon-green);
  border: 1px solid rgba(0,255,65,0.2);
}
body.vip-theme .role-badge.admin {
  background: rgba(255,0,170,0.15);
  color: var(--neon-pink);
  border: 1px solid rgba(255,0,170,0.2);
}
/* Промокоды */
body.vip-theme .promo-code {
  background: rgba(0,255,65,0.08);
  border-color: var(--neon-green);
  color: var(--neon-green);
}
/* Секция VIP */
body.vip-theme .vip-section {
  border-color: rgba(0,255,65,0.2);
  background: rgba(0,255,65,0.03);
}
body.vip-theme .vip-section h3 { color: var(--neon-green); }
/* ASSESSMENT / DATA */
body.vip-theme .hero-actions .btn.primary {
  font-family: var(--font-main);
  text-transform: uppercase;
  letter-spacing: 2px;
}
/* BETA тег */
body.vip-theme .beta-tag {
  display: inline-block;
  font-size: 0.55rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  background: rgba(255,0,170,0.2);
  color: var(--neon-pink);
  border: 1px solid rgba(255,0,170,0.3);
  animation: blink 1.5s step-end infinite;
  margin-left: 0.3rem;
  vertical-align: middle;
}`;
  document.head.appendChild(st);

  window.toggleVipTheme = function() {
    if (!isVip(currentUser)) return;
    body.classList.toggle('vip-theme');
    localStorage.setItem(VIP_THEME_KEY, body.classList.contains('vip-theme') ? '1' : '0');
  };

  if (isVipActive) {
    var btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.textContent = 'VIP тема';
    btn.style.position = 'fixed';
    btn.style.bottom = '1rem';
    btn.style.left = '1rem';
    btn.style.zIndex = '100';
    btn.style.fontSize = '0.75rem';
    btn.style.padding = '0.4rem 1rem';
    btn.onclick = window.toggleVipTheme;
    document.body.appendChild(btn);
  }
})();

async function loadSession() {
  if (!sb) return;

  // Вручную ищем Supabase сессию в localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.refresh_token) {
          await sb.auth.setSession({ refresh_token: parsed.refresh_token });
        }
        break;
      }
    }
  } catch (_) {}

  const { data } = await sb.auth.getSession();
  currentSession = data?.session || null;
  if (currentSession) {
    const { data: profile } = await sb.from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .single();
    if (profile) {
      currentUser = { ...currentSession.user, ...profile };
    } else {
      currentUser = { ...currentSession.user, email: currentSession.user.email, role: 'user' };
    }
    const { data: subs } = await sb.from('vip_subscriptions')
      .select('end_time')
      .eq('user_id', currentSession.user.id)
      .eq('is_active', true)
      .gt('end_time', new Date().toISOString())
      .limit(1);
    currentUser.vipUntil = subs?.length ? subs[0].end_time : null;
  } else {
    currentUser = null;
  }
}
