# push.ps1
# Script to automate building, committing, and pushing to GitHub (which triggers Vercel deployment)

param (
    [string]$Message = "auto-update"
)

# 1. Run local build to ensure no errors
Write-Host "Checking local build..." -ForegroundColor Cyan
cmd.exe /c npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please fix errors before pushing." -ForegroundColor Red
    exit 1
}
Write-Host "Build passed successfully!" -ForegroundColor Green

# 2. Git Add, Commit & Push
Write-Host "Staging changes..." -ForegroundColor Cyan
git add .

Write-Host "Committing changes with message: '$Message'..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "Pushing to GitHub (triggers Vercel deploy)..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Done! Changes pushed. Check your Vercel dashboard for deployment progress." -ForegroundColor Green
} else {
    Write-Host "Failed to push to GitHub." -ForegroundColor Red
}
