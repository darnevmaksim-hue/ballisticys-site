const USERS_KEY = 'ballisticys_users';
let currentUser = null;

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
    authLoginModal?.classList.add('hidden');
    updateUI();
  } else {
    status.textContent = 'Неверный email или пароль';
    status.style.color = '#ff7b72';
  }
});

document.getElementById('signup-submit-btn')?.addEventListener('click', () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-password-confirm').value;
  const status = document.getElementById('signup-status');
  if (password !== confirm) {
    status.textContent = 'Пароли не совпадают'; status.style.color = '#ff7b72'; return;
  }
  if (password.length < 8) {
    status.textContent = 'Минимум 8 символов'; status.style.color = '#ff7b72'; return;
  }
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  if (users[email]) {
    status.textContent = 'Email уже занят'; status.style.color = '#ff7b72'; return;
  }
  const role = Object.keys(users).length === 0 ? 'admin' : 'user';
  users[email] = { email, password, role, vipUntil: null };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  status.textContent = 'Успешно! Теперь войдите.';
  status.style.color = '#4ade80';
  setTimeout(() => {
    authSignupModal?.classList.add('hidden');
    authLoginModal?.classList.remove('hidden');
    document.getElementById('login-email').value = email;
  }, 1500);
});

profileLogoutBtn?.addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('ballisticys_session');
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
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  const sessionEmail = localStorage.getItem('ballisticys_session');
  currentUser = users[sessionEmail] || null;
  if (currentUser) {
    openAuthBtn?.classList.add('hidden');
    profileRoot?.classList.remove('hidden');
    profileEmail.textContent = currentUser.email;
    profileRole.textContent = currentUser.role;
    profileInitial.textContent = currentUser.email[0].toUpperCase();
    adminPanelLink?.classList.toggle('hidden', currentUser.role !== 'admin');
    toggleVipCards(currentUser.role === 'vip' || currentUser.role === 'admin');
    applyCurrentFilter();
  } else {
    openAuthBtn?.classList.remove('hidden');
    profileRoot?.classList.add('hidden');
    toggleVipCards(false);
  }
}

updateUI();

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

function loadAdminData() {
  loadPromoCodes();
  loadUsers();
  loadVIPList();
}

function loadPromoCodes() {
  const list = document.getElementById('promo-list');
  if (!list) return;
  const codes = JSON.parse(localStorage.getItem('ballisticys_promocodes') || '[]');
  if (codes.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет промокодов</p>';
    return;
  }
  list.innerHTML = codes.map(c => {
    const used = c.usedBy ? '(использован: ' + c.usedBy + ')' : '';
    return '<div class="promo-item ' + (c.usedBy ? 'used' : '') + '">' +
      '<code>' + c.code + '</code>' +
      '<span>' + c.durationHours + 'ч ' + used + '</span>' +
      '</div>';
  }).join('');
}

document.getElementById('promo-generate-btn')?.addEventListener('click', () => {
  const duration = parseInt(document.getElementById('promo-duration')?.value || '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const codes = JSON.parse(localStorage.getItem('ballisticys_promocodes') || '[]');
  codes.push({ code: code, durationHours: duration, usedBy: null, createdAt: Date.now() });
  localStorage.setItem('ballisticys_promocodes', JSON.stringify(codes));
  const result = document.getElementById('promo-result');
  if (result) {
    result.innerHTML = '<div class="promo-code-display">' +
      '<span class="promo-code">' + code + '</span>' +
      '<button class="btn primary" onclick="navigator.clipboard.writeText(\'' + code + '\')">Копировать</button>' +
      '</div>';
  }
  loadPromoCodes();
});

function loadUsers() {
  const list = document.getElementById('users-list');
  if (!list) return;
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  const entries = Object.entries(users);
  if (entries.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет пользователей</p>';
    return;
  }
  list.innerHTML = entries.map(function(e) {
    var email = e[0], u = e[1];
    var roleHtml = u.role === 'admin'
      ? '<span class="role-badge admin">admin</span>'
      : (u.vipUntil && Date.now() < u.vipUntil) || u.role === 'vip'
        ? '<span class="role-badge vip">vip</span>'
        : '<span class="role-badge user">user</span>';
    return '<div class="user-item">' +
      '<span>' + email + '</span> ' + roleHtml + ' ' +
      '<select onchange="changeUserRole(\'' + email.replace(/'/g, "\\'") + '\', this.value)" class="role-select">' +
      '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>user</option>' +
      '<option value="vip"' + (u.role === 'vip' ? ' selected' : '') + '>vip</option>' +
      '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>' +
      '</select></div>';
  }).join('');
}

window.changeUserRole = function(email, newRole) {
  var users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  if (!users[email]) return;
  users[email].role = newRole;
  if (newRole === 'vip' && !users[email].vipUntil) {
    users[email].vipUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
  }
  if (newRole !== 'vip') {
    users[email].vipUntil = null;
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  loadUsers();
  updateUI();
};

function loadVIPList() {
  var list = document.getElementById('vip-list');
  if (!list) return;
  var users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  var vips = Object.entries(users).filter(function(e) {
    var u = e[1];
    return u.role === 'vip' || u.role === 'admin' || (u.vipUntil && Date.now() < u.vipUntil);
  });
  if (vips.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim)">Нет активных VIP</p>';
    return;
  }
  list.innerHTML = vips.map(function(e) {
    var email = e[0], u = e[1];
    var remaining = u.vipUntil
      ? Math.max(0, Math.floor((u.vipUntil - Date.now()) / (1000 * 60 * 60 * 24))) + '\u0434'
      : '\u221E';
    return '<div class="vip-item">' +
      '<span>' + email + '</span>' +
      '<span>' + u.role + '</span>' +
      '<span>\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: ' + remaining + '</span>' +
      '</div>';
  }).join('');
}

(function() {
  var s = document.createElement('style');
  s.textContent = '.role-select{padding:0.3rem 0.5rem;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:4px;color:var(--text-main);font-family:var(--font-main);cursor:pointer}';
  document.head.appendChild(s);
})();

function isVip(user) {
  if (!user) return false;
  if (user.role === 'vip' || user.role === 'admin') {
    if (user.vipUntil) return Date.now() < user.vipUntil;
    return user.role === 'vip';
  }
  return false;
}

var VIP_THEME_KEY = 'ballisticys_vip_theme';

(function() {
  var body = document.body;
  var isVipActive = isVip(currentUser);
  if (isVipActive && localStorage.getItem(VIP_THEME_KEY) === '1') {
    body.classList.add('vip-theme');
  }
  var st = document.createElement('style');
  st.textContent = 'body.vip-theme{--accent-color:#ffd700}body.vip-theme .profile-trigger{background:linear-gradient(135deg,#b8860b,#ffd700);border-color:#ffd700}body.vip-theme .metric-value{color:#ffd700}body.vip-theme .hero-copy h1:after{content:" \\2605 VIP";font-size:0.4em;color:#ffd700;vertical-align:super}body.vip-theme .role-badge.vip{background:rgba(255,215,0,0.3)}';
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
