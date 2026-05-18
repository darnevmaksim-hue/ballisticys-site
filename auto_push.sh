#!/bin/bash

echo "=== Ballisticys Site Auto Push ==="
echo ""

cd "$(dirname "$0")"

echo "[1/3] Добавляю файлы в индекс..."
git add -A

echo "[2/3] Создаю коммит..."
git commit -m "auto: авто-обновление $(date '+%Y-%m-%d %H:%M:%S')" || echo "Изменений нет"

echo "[3/3] Отправляю на сервер..."
git push origin main

echo ""
echo "Готово! Сайт обновится через 2-5 минут на:"
echo "https://darnevmaksim-hue.github.io/ballisticys-site/"
