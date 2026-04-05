# Niftea Production Startup Script
# Run this once — PM2 keeps everything running even after terminal closes

Write-Host "Starting Niftea services..." -ForegroundColor Yellow

# 1. Start PostgreSQL if not running
$pgStatus = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if ($pgStatus.Status -ne "Running") {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
    & "D:\imp\PostgreSQL\18\bin\pg_ctl.exe" start -D "D:\imp\PostgreSQL\18\data"
    Start-Sleep -Seconds 3
}
Write-Host "PostgreSQL: Running" -ForegroundColor Green

# 2. Start services with PM2
Write-Host "Starting Niftea ingestion + web via PM2..." -ForegroundColor Cyan
pm2 start ecosystem.config.cjs
pm2 save

Write-Host ""
Write-Host "=== Niftea is running ===" -ForegroundColor Green
Write-Host "Ingestion: http://localhost:3001/health" -ForegroundColor White
Write-Host "Web:       http://localhost:3000" -ForegroundColor White
Write-Host "Cron:      7:00am IST daily (automatic)" -ForegroundColor White
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  pm2 logs              - View live logs"
Write-Host "  pm2 status            - Check service status"
Write-Host "  pm2 restart all       - Restart all services"
Write-Host "  pm2 stop all          - Stop all services"
Write-Host ""
Write-Host "Manual trigger:" -ForegroundColor Yellow
Write-Host '  Invoke-RestMethod -Uri http://localhost:3001/api/trigger -Method POST -ContentType "application/json" -Body "{}"'
