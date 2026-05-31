#!/bin/bash
# Запуск локального прокси для админ-панели Ballisticys
# После запуска открой http://127.0.0.1:3001/ в браузере

cd "$(dirname "$0")"
echo "Запуск прокси..."
node supabase-proxy.js &
sleep 2
google-chrome-stable "http://127.0.0.1:3001/" 2>/dev/null &
wait
