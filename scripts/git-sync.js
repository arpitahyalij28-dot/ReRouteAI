import { execSync } from 'child_process';
import fs from 'fs';

function findGit() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return 'git';
  } catch {
    const candidates = [
      'C:\\Users\\Omkar\\AppData\\Local\\GitHubDesktop\\app-3.6.4\\resources\\app\\git\\cmd\\git.exe',
      'C:\\Program Files\\Git\\cmd\\git.exe',
      'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
      'C:\\Users\\akash\\AppData\\Local\\github-copilot-git-2.53.0-4\\cmd\\git.exe',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return `"${p}"`;
    }
    return 'git';
  }
}

const git = findGit();
const commitMessage = process.argv.slice(2).join(' ').trim() || `chore: update features and sync with team (${new Date().toISOString()})`;

function run(cmd, capture = false) {
  try {
    return execSync(cmd, {
      stdio: capture ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      encoding: 'utf8'
    });
  } catch (err) {
    if (capture) throw err;
    process.exit(err.status || 1);
  }
}

console.log('🔄 [Git-Sync] Checking remote for updates from teammates...');
run(`${git} fetch origin`);

// Check if remote origin/main has commits we don't have locally
try {
  const incoming = run(`${git} log HEAD..origin/main --oneline`, true).trim();
  if (incoming) {
    console.log('📥 [Git-Sync] New incoming commits detected from team:');
    console.log(incoming);
    console.log('🔄 [Git-Sync] Rebase-pulling latest changes from origin/main...');
    run(`${git} pull --rebase origin main`);
  } else {
    console.log('✅ [Git-Sync] Local branch is up to date with origin/main.');
  }
} catch (e) {
  console.warn('⚠️ [Git-Sync] Note during remote check:', e.message);
}

// Check local changes
const status = run(`${git} status --porcelain`, true).trim();
if (!status) {
  console.log('✨ [Git-Sync] No local uncommitted changes. Everything is clean and synced!');
  process.exit(0);
}

console.log('📦 [Git-Sync] Staging local changes...');
run(`${git} add -A`);

console.log(`📝 [Git-Sync] Committing: "${commitMessage}"...`);
run(`${git} commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

// Pre-push test verification
console.log('🧪 [Git-Sync] Running test verification before push...');
try {
  run('npm test');
  console.log('✅ [Git-Sync] All unit tests passed!');
} catch {
  console.error('❌ [Git-Sync] Tests failed! Aborting push to protect the team repository.');
  process.exit(1);
}

console.log('🚀 [Git-Sync] Pushing safely to origin main...');
run(`${git} push origin main`);
console.log('🎉 [Git-Sync] Push successful! Teammates can now pull your latest work.');
