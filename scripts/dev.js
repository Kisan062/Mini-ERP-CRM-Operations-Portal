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

function cleanup() {
  console.log('\n🛑 Shutting down servers...');
  if (process.platform === 'win32') {
    if (backend.pid) {
      try { spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t']); } catch (_) {}
    }
    if (frontend.pid) {
      try { spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']); } catch (_) {}
    }
  } else {
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
