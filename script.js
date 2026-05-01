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

const canvas = document.getElementById('trajectoryCanvas');
const velocityInput = document.getElementById('velocityInput');
const angleInput = document.getElementById('angleInput');
const distanceInput = document.getElementById('distanceInput');
const windInput = document.getElementById('windInput');

const velocityValue = document.getElementById('velocityValue');
const angleValue = document.getElementById('angleValue');
const distanceValue = document.getElementById('distanceValue');
const windValue = document.getElementById('windValue');

const flightTime = document.getElementById('flightTime');
const impactPoint = document.getElementById('impactPoint');
const targetError = document.getElementById('targetError');

if (canvas && velocityInput && angleInput && distanceInput && windInput) {
  const ctx = canvas.getContext('2d');
  let frame = 0;

  const g = 9.81;

  function simulate(v0, angleDeg, windAccel) {
    const angle = angleDeg * Math.PI / 180;
    let x = 0;
    let y = 0;
    let vx = v0 * Math.cos(angle);
    let vy = v0 * Math.sin(angle);
    const dt = 0.03;
    const pts = [{ x: 0, y: 0 }];
    let t = 0;

    while (t < 30 && x < 900 && y >= 0) {
      vx += windAccel * dt;
      vy -= g * dt;
      x += vx * dt;
      y += vy * dt;
      t += dt;
      if (y >= 0) pts.push({ x, y });
    }

    return {
      points: pts,
      time: t,
      impactX: x
    };
  }

  function drawGrid(w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0c1320';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(105, 145, 214, 0.16)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(240, 189, 131, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, h - 24);
    ctx.lineTo(w, h - 24);
    ctx.stroke();
  }

  function render() {
    const w = canvas.width;
    const h = canvas.height;

    const v0 = Number(velocityInput.value);
    const angle = Number(angleInput.value);
    const targetDist = Number(distanceInput.value);
    const wind = Number(windInput.value);

    velocityValue.textContent = String(v0);
    angleValue.textContent = String(angle);
    distanceValue.textContent = String(targetDist);
    windValue.textContent = String(wind);

    const result = simulate(v0, angle, wind * 0.55);
    const pts = result.points;

    const maxX = Math.max(targetDist + 60, result.impactX + 40, 280);
    const maxY = Math.max(110, ...pts.map((p) => p.y)) + 30;

    drawGrid(w, h);

    const scaleX = (w - 40) / maxX;
    const scaleY = (h - 42) / maxY;

    const animatedCount = Math.max(2, Math.floor((pts.length - 1) * (0.35 + 0.65 * (Math.sin(frame * 0.04) * 0.5 + 0.5))));

    ctx.beginPath();
    for (let i = 0; i < animatedCount; i += 1) {
      const px = 20 + pts[i].x * scaleX;
      const py = h - 24 - pts[i].y * scaleY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#7cd2ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(124, 210, 255, 0.65)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const impactCanvasX = 20 + result.impactX * scaleX;
    const targetCanvasX = 20 + targetDist * scaleX;

    ctx.fillStyle = '#ffca91';
    ctx.fillRect(targetCanvasX - 2, h - 42, 4, 20);

    ctx.fillStyle = '#ff8d8d';
    ctx.beginPath();
    ctx.arc(impactCanvasX, h - 24, 5.2, 0, Math.PI * 2);
    ctx.fill();

    const err = result.impactX - targetDist;
    flightTime.textContent = `${result.time.toFixed(2)}s`;
    impactPoint.textContent = `${result.impactX.toFixed(1)}m`;
    targetError.textContent = `${err >= 0 ? '+' : ''}${err.toFixed(1)}m`;

    frame += 1;
    requestAnimationFrame(render);
  }

  [velocityInput, angleInput, distanceInput, windInput].forEach((el) => {
    el.addEventListener('input', () => {
      // render loop runs continuously; this keeps value labels instant.
      velocityValue.textContent = velocityInput.value;
      angleValue.textContent = angleInput.value;
      distanceValue.textContent = distanceInput.value;
      windValue.textContent = windInput.value;
    });
  });

  render();
}
