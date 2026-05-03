@echo off
echo === FIXING GIT AND UPLOADING ===
cd /d "%~dp0"

echo 1. Adding all files...
git add --all

echo 2. Committing changes...
git commit -m "Emergency fix for downloads"

echo 3. Pushing to GitHub...
echo (If a window pops up, please log in)
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!!!!!!! ERROR DETECTED !!!!!!!!
    echo Something went wrong. Please look at the messages above.
    echo If it says "Permission denied", you need to log in to GitHub.
    echo If it says "Authentication failed", your password/token is wrong.
) else (
    echo.
    echo SUCCESS! Files should be on the server in 2 minutes.
)

pause
