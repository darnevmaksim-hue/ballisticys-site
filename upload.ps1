# Скрипт для автоматической загрузки файлов на GitHub
$ErrorActionPreference = 'Stop'

Write-Host "Начинаю подготовку к загрузке файлов на сервер..." -ForegroundColor Cyan

# Проверяем наличие git
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Ошибка: Git не установлен! Установите Git с сайта git-scm.com" -ForegroundColor Red
    pause
    exit
}

# Добавляем абсолютно всё
git add --all

# Создаем коммит
git commit -m "Force update all files including downloads"

Write-Host "Сейчас откроется окно GitHub для входа (если вы еще не вошли)." -ForegroundColor Yellow
Write-Host "Пожалуйста, подтвердите вход в браузере, чтобы файлы загрузились." -ForegroundColor Yellow

# Отправляем на сервер
git push origin main

Write-Host "ГОТОВО! Файлы загружены. Подождите 1-2 минуты, пока GitHub обновит сайт." -ForegroundColor Green
pause
