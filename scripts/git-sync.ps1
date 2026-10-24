param(
    [string]$Message = "chore: sync latest changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "==> Checking remote repository for team updates..." -ForegroundColor Cyan
git fetch origin main

$behind = (git rev-list --count HEAD..origin/main).Trim()
if ([int]$behind -gt 0) {
    Write-Host "==> Teammates pushed $behind new commit(s)! Pulling and rebasing..." -ForegroundColor Yellow
    git pull --rebase origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "==> Conflict detected during rebase! Please resolve conflicts before pushing." -ForegroundColor Red
        exit 1
    }
}

Write-Host "==> Checking git status..." -ForegroundColor Cyan
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No local changes to commit. Everything up to date!" -ForegroundColor Green
    exit 0
}

Write-Host "==> Staging changes..." -ForegroundColor Cyan
git add -A

Write-Host "==> Committing: '$Message'..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "==> Verifying remote again before push..." -ForegroundColor Cyan
git fetch origin main
$behindAfterCommit = (git rev-list --count HEAD..origin/main).Trim()
if ([int]$behindAfterCommit -gt 0) {
    Write-Host "==> New commits arrived while committing. Rebasing..." -ForegroundColor Yellow
    git pull --rebase origin main
}

Write-Host "==> Pushing to origin main..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "==> Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "==> Push failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
