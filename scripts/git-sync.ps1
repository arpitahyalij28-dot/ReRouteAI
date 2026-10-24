param(
    [string]$Message = "chore: sync latest changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

# Search for available git binary across developer machines
$gitCmd = "git"
$knownGitPaths = @(
    "C:\Users\Omkar\AppData\Local\GitHubDesktop\app-3.6.4\resources\app\git\cmd\git.exe",
    "C:\Users\akash\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe",
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe"
)

foreach ($path in $knownGitPaths) {
    if (Test-Path $path) {
        $gitCmd = "& `"$path`""
        break
    }
}

Write-Host "==> Checking remote repository for teammates' updates..." -ForegroundColor Cyan
Invoke-Expression "$gitCmd fetch origin"

$incoming = Invoke-Expression "$gitCmd log HEAD..origin/main --oneline"
if (-not [string]::IsNullOrWhiteSpace($incoming)) {
    Write-Host "==> New commits found from team:" -ForegroundColor Yellow
    Write-Host $incoming
    Write-Host "==> Rebase-pulling team commits..." -ForegroundColor Cyan
    Invoke-Expression "$gitCmd pull --rebase origin main"
} else {
    Write-Host "==> Local branch is already up-to-date with team remote." -ForegroundColor Green
}

$status = Invoke-Expression "$gitCmd status --porcelain"
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No local changes to commit. Everything clean!" -ForegroundColor Green
    exit 0
}

Write-Host "==> Staging local changes..." -ForegroundColor Cyan
Invoke-Expression "$gitCmd add -A"

Write-Host "==> Committing: '$Message'..." -ForegroundColor Cyan
Invoke-Expression "$gitCmd commit -m `"$Message`""

Write-Host "==> Running npm test pre-push check..." -ForegroundColor Cyan
npm.cmd test
if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Tests failed! Push cancelled to prevent breaking teammate code." -ForegroundColor Red
    exit 1
}

Write-Host "==> Pushing safely to origin main..." -ForegroundColor Cyan
Invoke-Expression "$gitCmd push origin main"

if ($LASTEXITCODE -eq 0) {
    Write-Host "==> Successfully pushed to origin main!" -ForegroundColor Green
} else {
    Write-Host "==> Push failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
