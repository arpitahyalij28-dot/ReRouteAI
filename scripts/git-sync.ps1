param(
    [string]$Message = "chore: sync latest changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

$env:Path = "C:\Users\akash\AppData\Local\github-copilot-git-2.53.0-4\cmd;C:\Program Files\GitHub CLI;$env:Path"

Write-Host "==> Checking git status..." -ForegroundColor Cyan
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit. Everything clean!" -ForegroundColor Green
    exit 0
}

Write-Host "==> Staging changes..." -ForegroundColor Cyan
git add -A

Write-Host "==> Committing: '$Message'..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "==> Pushing to origin main..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "==> Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "==> Push failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
