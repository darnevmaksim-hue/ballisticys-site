// Фильтрация карточек
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
      
      if (visible) {
        card.classList.remove('hidden');
        setTimeout(() => card.style.opacity = '1', 10);
      } else {
        card.style.opacity = '0';
        setTimeout(() => card.classList.add('hidden'), 300);
      }
    });
  });
});

// Анимация появления при скролле
const revealNodes = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        if (entry.target.classList.contains('telemetry')) {
          animateCounters();
        }
      }
    });
  },
  { threshold: 0.1 }
);

revealNodes.forEach((node) => revealObserver.observe(node));

// Анимация счетчиков
function animateCounters() {
  const counters = document.querySelectorAll('.metric-value[data-count]');
  counters.forEach((counter) => {
    if (counter.classList.contains('animated')) return;
    counter.classList.add('animated');

    const target = Number(counter.dataset.count || 0);
    const suffix = counter.textContent.includes('ms') ? 'ms' : '%';
    const duration = 2000;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      const value = Math.round(target * easeProgress);
      counter.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

// Эффект параллакса для фона
document.addEventListener('mousemove', (e) => {
  const grid = document.querySelector('.background-grid');
  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;
  grid.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
});

// Добавляем эффект "печати" для заголовка
function typeWriter(element) {
  const text = element.textContent;
  element.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, 50);
    }
  }
  type();
}

const mainTitle = document.querySelector('.hero-copy h1');
if (mainTitle) typeWriter(mainTitle);