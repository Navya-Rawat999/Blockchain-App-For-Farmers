const { spawn } = require('child_process');
const path = require('path');

// Start Backend
const backend = spawn('node', ['src/index.js'], {
  cwd: path.join(__dirname, 'Backend'),
  stdio: 'inherit',
  shell: true
});

// Start Frontend
const frontend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'Frontend'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});