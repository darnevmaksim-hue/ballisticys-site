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
  const stateEl = document.getElementById('fetch-state');
  const rateLimitEl = document.getElementById('rate-limit');
  const refreshBtn = document.getElementById('refresh-btn');
  const assetsBody = document.getElementById('assets-body');

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
        <td>${row.release}</td>
        <td>${row.downloads}</td>
        <td>${formatBytes(row.size)}</td>
        <td>${formatDate(row.updatedAt)}</td>
        <td><a href="${row.url}" target="_blank" rel="noopener noreferrer">Открыть</a></td>
      </tr>
    `).join('');
  }

  async function fetchReleaseStats() {
    if (refreshBtn) refreshBtn.disabled = true;
    if (stateEl) stateEl.textContent = 'Состояние: загрузка данных...';
    try {
      const response = await fetch(`https://api.github.com/repos/${REPO}/releases`);
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

      const releases = await response.json();
      if (!Array.isArray(releases)) throw new Error('Invalid GitHub API response');

      if (rateLimitEl) {
        const remaining = response.headers.get('x-ratelimit-remaining') ?? '-';
        const limit = response.headers.get('x-ratelimit-limit') ?? '-';
        rateLimitEl.textContent = `GitHub API rate limit: ${remaining} / ${limit}`;
      }

      let fabric = 0;
      let forge = 0;
      let injector = 0;
      let agent = 0;
      let total = 0;
      let assetsCount = 0;
      const rows = [];

      releases.forEach((rel) => {
        const assets = Array.isArray(rel.assets) ? rel.assets : [];
        assets.forEach((asset) => {
          const type = detectType(asset.name);
          const downloads = Number(asset.download_count || 0);
          if (type === 'fabric') fabric += downloads;
          if (type === 'forge') forge += downloads;
          if (type === 'injector') injector += downloads;
          if (type === 'agent') agent += downloads;
          total += downloads;
          assetsCount += 1;

          rows.push({
            type,
            name: asset.name || 'unknown',
            release: rel.tag_name || rel.name || 'untagged',
            downloads,
            size: Number(asset.size || 0),
            updatedAt: asset.updated_at,
            url: asset.browser_download_url || '#'
          });
        });
      });

      rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      renderAssetsRows(rows);

      setCount('count-fabric', fabric);
      setCount('count-forge', forge);
      setCount('count-injector', injector);
      setCount('count-agent', agent);
      setCount('count-total', total);
      setCount('count-releases', releases.length);
      setCount('count-assets', assetsCount);
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
    refreshBtn.addEventListener('click', fetchReleaseStats);
  }
  fetchReleaseStats();
}
