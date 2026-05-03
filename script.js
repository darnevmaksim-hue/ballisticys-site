document.addEventListener('DOMContentLoaded', () => {
    // Анимация появления
    const revealNodes = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('show');
        });
    }, { threshold: 0.1 });
    revealNodes.forEach(node => revealObserver.observe(node));

    // Эффект пульсации радара при клике
    document.addEventListener('mousedown', (e) => {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            top: ${e.clientY}px;
            left: ${e.clientX}px;
            width: 2px;
            height: 2px;
            background: rgba(255, 0, 0, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: pulse 1s ease-out forwards;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1000);
    });
});

// Добавляем анимацию в стили через JS
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
    0% { width: 0; height: 0; opacity: 1; border: 2px solid red; }
    100% { width: 500px; height: 500px; opacity: 0; border: 10px solid red; }
}
`;
document.head.appendChild(style);
