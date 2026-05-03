document.addEventListener('DOMContentLoaded', () => {
    // Анимация появления
    const revealNodes = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.1 });
    revealNodes.forEach(node => revealObserver.observe(node));

    // Фильтрация
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.mod-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            cards.forEach(card => {
                if (filter === 'all' || card.dataset.core === filter) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });

    // Счетчики
    const counters = document.querySelectorAll('.value');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.count);
        const suffix = counter.innerText.includes('ms') ? 'ms' : '%';
        let count = 0;
        const update = () => {
            const speed = target / 50;
            if (count < target) {
                count += speed;
                counter.innerText = Math.round(count) + suffix;
                setTimeout(update, 20);
            } else {
                counter.innerText = target + suffix;
            }
        };
        update();
    });
});
