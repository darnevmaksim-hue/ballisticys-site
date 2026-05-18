# Auto Push Script for Ballisticys Site
Write-Host "=== Ballisticys Site Auto Push ===" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] Добавляю файлы в индекс..." -ForegroundColor Green
git add -A

Write-Host "[2/3] Создаю коммит..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "auto: авто-обновление $timestamp" -NoVerify 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Изменений нет или коммит отменён" -ForegroundColor Yellow
}

Write-Host "[3/3] Отправляю на сервер..." -ForegroundColor Green
git push origin main

Write-Host ""
Write-Host "Готово! Сайт обновится через 2-5 минут на:" -ForegroundColor Cyan
Write-Host "https://darnevmaksim-hue.github.io/ballisticys-site/" -ForegroundColor White
