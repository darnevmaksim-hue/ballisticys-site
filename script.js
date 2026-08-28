const DOWNLOAD_BASE = "https://raw.githubusercontent.com/darnevmaksim-hue/ballisticys-site/mod-files/downloads";

const DOWNLOAD_MAP = {
  "Ballistics Calculator (Fabric)|1.20.1": "bbb-fabric-port-2.0pre4-fabric-port.jar",
  "Ballistics Calculator (Forge)|1.20.1": "blur-mod-1.0.0-forge.jar",
  "Ballistics Calculator (NeoForge)|1.21.1": "ballistic-calculator-2.0.0-1.21.1-neoforge.jar",
};

function downloadMod(modName, mcVersion, target) {
  target = target || event?.target;
  var file = target?.dataset?.file;
  if (!file) file = DOWNLOAD_MAP[modName + '|' + mcVersion];
  if (!file) {
    if (target) { target.disabled = false; target.textContent = 'Не найдено'; }
    return;
  }
  if (target) { target.disabled = true; target.textContent = '⏳ Загрузка...'; }
  var a = document.createElement('a');
  a.href = DOWNLOAD_BASE + '/' + file;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (target) { target.disabled = false; target.textContent = 'Скачано'; }
}

function changeGlobalMc(sel) {
  var mc = sel.value;
  document.querySelectorAll('.mc-data, .mc-dl').forEach(function(el) {
    var show = el.dataset.mc === mc || el.dataset.mc === 'any';
    el.style.display = show ? '' : 'none';
  });
  applyCurrentFilter();
}

function applyCurrentFilter() {
  var active = document.querySelector('.filter.active');
  if (!active) return;
  var filter = active.dataset.filter;
  document.querySelectorAll('.mod-card').forEach(function(card) {
    var visibleData = card.querySelector('.mc-data:not([style*="none"])') || card.querySelector('ul:not(.mc-data)');
    var hasVisible = !!visibleData;
    var show = filter === 'all' || card.dataset.core === filter;
    card.style.display = (show && hasVisible) ? '' : 'none';
  });
}

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
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => observer.observe(el));
}

revealOnScroll();
setTimeout(animateCounters, 600);

(function init() {
  var mcSel = document.querySelector('.mc-global-select');
  if (mcSel) changeGlobalMc(mcSel);
})();

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyCurrentFilter();
  });
});

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.mc-dl');
  if (!btn) return;
  var mod = btn.dataset.mod;
  var mc = btn.dataset.mc;
  if (mod && mc) downloadMod(mod, mc, btn);
});

var THEME_KEY = 'ballisticys_theme';

window.setTheme = function(theme) {
  document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
  if (theme) document.body.classList.add('theme-' + theme);
  localStorage.setItem(THEME_KEY, theme);
};

(function() {
  var savedTheme = localStorage.getItem(THEME_KEY) || '';
  if (savedTheme) document.body.classList.add('theme-' + savedTheme);
})();

var themeSel = document.getElementById('theme-selector');
if (themeSel) themeSel.classList.remove('hidden');

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

(function initDashboard() {
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