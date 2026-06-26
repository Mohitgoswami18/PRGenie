# PRGenie Startup Script

Write-Host "🚀 Starting PRGenie..." -ForegroundColor Cyan

# Check if Backend venv exists
if (-not (Test-Path "Backend\.venv")) {
    Write-Host "⚠️  Python virtual environment not found in Backend/.venv!" -ForegroundColor Yellow
    Write-Host "Creating virtual environment and installing dependencies..." -ForegroundColor Gray
    python -m venv Backend\.venv
    & Backend\.venv\Scripts\pip install -r Backend\requirements.txt
}

# Check if Frontend node_modules exists
if (-not (Test-Path "Frontend\node_modules")) {
    Write-Host "⚠️  Node.js dependencies not found in Frontend/node_modules!" -ForegroundColor Yellow
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    cd Frontend
    npm install
    cd ..
}

# Start Backend API in a new PowerShell window
Write-Host "🔥 Starting Backend API server on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend; .\.venv\Scripts\uvicorn main:app --reload --port 8000"

# Start Frontend Dev Server in a new PowerShell window
Write-Host "💻 Starting Frontend dev server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Frontend; npm run dev"

Write-Host "✅ Both services launched in separate windows!" -ForegroundColor Green
