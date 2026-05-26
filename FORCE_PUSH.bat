@echo off
cd /d "%~dp0"
echo WARNING: this script rewrites remote history.
echo Use only when normal push is impossible and you understand the risk.
set /p CONFIRM=Type FORCE to continue: 
if /I not "%CONFIRM%"=="FORCE" (
  echo Cancelled.
  pause
  exit /b 1
)

echo FORCE UPLOADING...
git add --all
git commit -m "Final design fix %RANDOM%"
git push origin main --force-with-lease
echo DONE! Wait 30 seconds and press CTRL+F5 on the site.
pause
