#!/bin/bash

echo "================================"
echo "  Ballisticys Site Auto Push   "
echo "================================"
echo ""

cd "$(dirname "$0")"

# Шаг 1: Добавление файлов
echo "[1/3] Добавляю файлы в индекс..."
git add -A
echo "✓ Готово (100%)"
echo ""

# Шаг 2: Коммит
echo "[2/3] Создаю коммит..."
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "auto: обновление $TIMESTAMP" 2>&1
if [ $? -ne 0 ]; then
    echo "⚠ Изменений нет или отменено"
else
    echo "✓ Готово (100%)"
fi
echo ""

# Шаг 3: Пуш с прогрессом
echo "[3/3] Отправляю на сервер..."
git push origin main --progress
echo "✓ Готово (100%)"
echo ""

echo "================================"
echo "✓ ГОТОВО!"
echo "================================"
echo "Сайт обновится через 2-5 минут:"
echo "https://darnevmaksim-hue.github.io/ballisticys-site/"
