# Ballisticys Mods Site

Статический сайт для модов Ballisticys.

## Локальный запуск

```powershell
py -m http.server 5510 --bind 127.0.0.1
```

Открыть: `http://127.0.0.1:5510`

## Публикация на GitHub Pages

1. Создай пустой репозиторий на GitHub (например `ballisticys-site`).
2. Выполни команды:

```powershell
git remote add origin <URL_РЕПОЗИТОРИЯ>
git push -u origin main
```

3. На GitHub: `Settings -> Pages -> Build and deployment -> Source: Deploy from a branch`.
4. Ветка: `main`, папка: `/ (root)`.

После деплоя ссылка будет вида:
`https://<username>.github.io/ballisticys-site/`
