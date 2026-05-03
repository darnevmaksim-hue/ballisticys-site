document.addEventListener('DOMContentLoaded', () => {
    // 1. Анимация появления (Speed Ramp)
    const revealNodes = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('show');
        });
    }, { threshold: 0.1 });
    revealNodes.forEach(node => revealObserver.observe(node));

    // 2. 3D ГЕОМЕТРИЯ (PHYSMATH STYLE)
    const canvas = document.getElementById('canvas-bg');
    const ctx = canvas.getContext('2d');
    let points = [];
    let angle = 0;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Создаем облако точек для 3D куба
    for (let x = -1; x <= 1; x += 0.5) {
        for (let y = -1; y <= 1; y += 0.5) {
            for (let z = -1; z <= 1; z += 0.5) {
                points.push({ x, y, z });
            }
        }
    }

    const project = (p) => {
        // Вращение по осям
        let x = p.x * Math.cos(angle) - p.z * Math.sin(angle);
        let z = p.x * Math.sin(angle) + p.z * Math.cos(angle);
        let y = p.y * Math.cos(angle) - z * Math.sin(angle);
        z = p.y * Math.sin(angle) + z * Math.cos(angle);

        // Проекция на 2D
        const factor = 400 / (z + 4);
        return {
            x: x * factor + canvas.width / 2,
            y: y * factor + canvas.height / 2,
            z: z
        };
    };

    const animate = () => {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        angle += 0.01;

        const projected = points.map(project);

        projected.forEach((p, i) => {
            ctx.fillStyle = `rgba(0, 242, 255, ${0.5 + p.z / 4})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();

            // Соединяем точки линиями
            projected.forEach((p2, j) => {
                const dist = Math.sqrt((p.x - p2.x)**2 + (p.y - p2.y)**2);
                if (dist < 80) {
                    ctx.strokeStyle = `rgba(0, 242, 255, ${0.1 * (1 - dist / 80)})`;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });
        requestAnimationFrame(animate);
    };
    animate();

    // Глитч-эффект при скролле
    window.addEventListener('scroll', () => {
        document.body.style.transform = `skewY(${window.scrollY / 100}deg)`;
        setTimeout(() => document.body.style.transform = '', 50);
    });
});