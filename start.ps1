Write-Host "🚀 Запуск бэкенда и фронтенда..." -ForegroundColor Green
Write-Host ""

# Запуск бэкенда в новом окне
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Запуск бэкенда...' -ForegroundColor Cyan; npm run dev"

# Небольшая пауза
Start-Sleep -Seconds 2

# Запуск фронтенда в новом окне
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '⚛️  Запуск фронтенда...' -ForegroundColor Yellow; npm start"

Write-Host ""
Write-Host "✅ Оба сервера запускаются в отдельных окнах!" -ForegroundColor Green
Write-Host "📌 Бэкенд: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📌 Фронтенд: http://localhost:3001" -ForegroundColor Yellow
Write-Host "📌 Swagger: http://localhost:3000/api-docs" -ForegroundColor Magenta
Write-Host ""
Write-Host "Для остановки серверов закройте окна PowerShell" -ForegroundColor Gray
