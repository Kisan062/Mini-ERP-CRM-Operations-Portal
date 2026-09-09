const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('  🚀 Mini ERP + CRM Operations Portal Launcher');
console.log('  Backend:  http://localhost:5000');
console.log('  Frontend: http://localhost:5173');
console.log('====================================================\n');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'backend'),
  shell: true,
  stdio: 'inherit',
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'frontend'),
  shell: true,
  stdio: 'inherit',
});

let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n🛑 Shutting down servers...');
  if (process.platform === 'win32') {
    if (backend.pid) {
      try {
        const k = spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t'], { shell: true });
        k.on('error', () => {});
      } catch (_) {}
    }
    if (frontend.pid) {
      try {
        const k = spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t'], { shell: true });
        k.on('error', () => {});
      } catch (_) {}
    }
  } else {
    try { backend.kill('SIGTERM'); } catch (_) {}
    try { frontend.kill('SIGTERM'); } catch (_) {}
  }
  setTimeout(() => process.exit(), 500);
}

backend.on('exit', (code) => {
  if (code && code !== 0 && !isCleaningUp) {
    console.error(`\n⚠️ Backend exited with code ${code}`);
    cleanup();
  }
});

frontend.on('exit', (code) => {
  if (code && code !== 0 && !isCleaningUp) {
    console.error(`\n⚠️ Frontend exited with code ${code}`);
    cleanup();
  }
});

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
