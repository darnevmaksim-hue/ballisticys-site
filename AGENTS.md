# Session Summary — 31 May 2026

## What was done today

### VIP/User permissions overhaul
- **1.20.1** — для обычных юзеров (бесплатно)
- **1.21.1** — только VIP/Admin (data-vip на кнопках, ul.mc-data, скрыт из селектора)
- **NeoForge** карточка целиком `data-vip="true"` — только для VIP
- **Темы**: обычные юзеры видят только "Обычная" + "Горная"; Hacker/iOS скрыты
- **Промокоды**: доступ истекает через 30 минут (было duration_hours)

### Key implementation details
- `applyCurrentFilter()` проверяет `card.dataset.vip === 'true'` для скрытия карт
- `changeGlobalMc()` проверяет `el.dataset.vip` на `.mc-data` и `.mc-dl` элементах
- `updateUI()` скрывает 1.21.1 опцию в селекте для не-VIP, принудительно переключает на 1.20.1
- `toggleVipCards()` — пустая (убрали логику)
- `setTheme()` и загрузка темы блокируют hacker/ios для не-VIP
- Expires_at в `mod_access` всегда `now + 30min` (было `durHours * 1h`)

### Open issues
- "Кнопки не энтероктивные" — не диагностировано (нет консольных ошибок от юзера)
