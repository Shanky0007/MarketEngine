# Deployment Setup Script (PowerShell)
# Run this before deploying to install dependencies and verify setup

Write-Host "🚀 Market Story Engine - Deployment Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the root directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

# Install root dependencies
Write-Host "→ Installing root dependencies..."
npm install

# Install synthesis dependencies
Write-Host "→ Installing synthesis dependencies..."
Set-Location synthesis
npm install
Set-Location ..

# Install publisher dependencies
Write-Host "→ Installing publisher dependencies..."
Set-Location publisher
npm install
Set-Location ..

Write-Host ""
Write-Host "✅ Dependencies installed!" -ForegroundColor Green
Write-Host ""

# Build all services
Write-Host "🔨 Building all services..." -ForegroundColor Yellow
Write-Host ""

npm run build

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host ""

# Test health checks
Write-Host "🏥 Testing health checks..." -ForegroundColor Yellow
Write-Host ""

# Start services in background
Write-Host "→ Starting services..."
$devProcess = Start-Process npm -ArgumentList "run", "dev" -PassThru -NoNewWindow

# Wait for services to start
Start-Sleep -Seconds 5

# Test health checks
Write-Host "→ Testing ingestion health..."
try {
    Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing | Out-Null
    Write-Host "✅ Ingestion OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Ingestion health check failed" -ForegroundColor Red
}

Write-Host "→ Testing synthesis health..."
try {
    Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing | Out-Null
    Write-Host "✅ Synthesis OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Synthesis health check failed" -ForegroundColor Red
}

Write-Host "→ Testing publisher health..."
try {
    Invoke-WebRequest -Uri "http://localhost:3003/health" -UseBasicParsing | Out-Null
    Write-Host "✅ Publisher OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Publisher health check failed" -ForegroundColor Red
}

Write-Host "→ Testing web app..."
try {
    Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing | Out-Null
    Write-Host "✅ Web app OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Web app health check failed" -ForegroundColor Red
}

# Stop services
Stop-Process -Id $devProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Health checks complete!" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review PRE-DEPLOYMENT-CHECKLIST.md"
Write-Host "2. Follow DEPLOYMENT-QUICKSTART.md"
Write-Host "3. Deploy to Vercel + Railway"
Write-Host ""
Write-Host "Good luck! 🚀" -ForegroundColor Cyan
