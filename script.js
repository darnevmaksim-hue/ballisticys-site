document.addEventListener('DOMContentLoaded', () => {
    // Эффект расшифровки текста
    const scrambleText = (el) => {
        const originalText = el.innerText;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+';
        let iteration = 0;
        
        const interval = setInterval(() => {
            el.innerText = originalText.split('')
                .map((char, index) => {
                    if(index < iteration) return originalText[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join('');
            
            if(iteration >= originalText.length) clearInterval(interval);
            iteration += 1 / 3;
        }, 30);
    };

    const title = document.querySelector('h1');
    if(title) scrambleText(title);

    // Линия сканирования
    const scanner = document.createElement('div');
    scanner.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:2px; background:rgba(0,242,255,0.2); box-shadow:0 0 10px rgba(0,242,255,0.5); z-index:101; pointer-events:none;';
    document.body.appendChild(scanner);

    let scannerPos = 0;
    const animateScanner = () => {
        scannerPos += 2;
        if(scannerPos > window.innerHeight) scannerPos = 0;
        scanner.style.top = scannerPos + 'px';
        requestAnimationFrame(animateScanner);
    };
    animateScanner();

    // Генератор логов
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    document.body.appendChild(logContainer);

    const logMessages = [
        '> INITIALIZING BALLISTIC_CORE...',
        '> SCANNING FOR TARGETS...',
        '> CALC_TRAJECTORY: SUCCESS',
        '> INJECTOR_STATUS: READY',
        '> CONNECTION: ENCRYPTED',
        '> PARSING_MAP_DATA...',
        '> WIND_COMPENSATION: ACTIVE'
    ];

    setInterval(() => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerText = logMessages[Math.floor(Math.random() * logMessages.length)];
        logContainer.appendChild(entry);
        if(logContainer.childNodes.length > 8) logContainer.removeChild(logContainer.firstChild);
    }, 2000);

    // Режим опасности при наведении на кнопки
    const btns = document.querySelectorAll('.btn');
    btns.forEach(b => {
        b.addEventListener('mouseenter', () => document.body.classList.add('danger-mode'));
        b.addEventListener('mouseleave', () => document.body.classList.remove('danger-mode'));
    });

    // Слежение за мышью (Радар)
    const radar = document.createElement('div');
    radar.style.cssText = 'position:fixed; width:100px; height:100px; border:1px solid rgba(0,242,255,0.3); border-radius:50%; pointer-events:none; z-index:999; transform:translate(-50%, -50%); transition: 0.1s ease-out;';
    radar.innerHTML = '<div style="position:absolute; top:50%; left:-10%; width:120%; height:1px; background:rgba(0,242,255,0.2)"></div><div style="position:absolute; left:50%; top:-10%; height:120%; width:1px; background:rgba(0,242,255,0.2)"></div>';
    document.body.appendChild(radar);

    document.addEventListener('mousemove', (e) => {
        radar.style.left = e.clientX + 'px';
        radar.style.top = e.clientY + 'px';
    });

    // Оживляем телеметрию (флуктуации)
    const metrics = document.querySelectorAll('.metric-value');
    setInterval(() => {
        metrics.forEach(m => {
            const base = parseInt(m.getAttribute('data-count'));
            const random = Math.floor(Math.random() * 3) - 1;
            const suffix = m.innerText.includes('ms') ? 'ms' : '%';
            m.innerText = (base + random) + suffix;
        });
    }, 1500);

    // Фильтры с глитч-эффектом
    const filterButtons = document.querySelectorAll('.filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.style.filter = 'invert(1) hue-rotate(90deg)';
            setTimeout(() => document.body.style.filter = '', 50);
        });
    });
});
