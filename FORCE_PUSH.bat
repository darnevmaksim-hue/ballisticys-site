@echo off
cd /d "%~dp0"
echo FORCE UPLOADING...
git add --all
git commit -m "Final design fix %RANDOM%"
git push origin main --force
echo DONE! Wait 30 seconds and press CTRL+F5 on the site.
pause
