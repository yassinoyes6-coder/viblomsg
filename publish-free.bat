@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   VIBLO-MSG - نشر مؤقت مجاني عبر Cloudflare
echo ============================================
echo.
echo [1/2] تشغيل الخادم على المنفذ 3000...
start "VIBLO-MSG Server" cmd /c "node server.js"
timeout /t 3 /nobreak >nul

echo [2/2] فتح الرابط العام...
echo.
echo  سيظهر الرابط العام (https://....trycloudflare.com) في النافذة الجديدة.
echo  اترك النافذتين مفتوحتين ما دمت تريد الموقع متاحاً.
echo.
tools\cloudflared.exe tunnel --url http://localhost:3000 --no-autoupdate
pause
