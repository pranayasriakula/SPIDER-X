// Local test launcher. Never loads backend/.env or changes production settings.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const dotenv = require(path.join(backend, 'node_modules', 'dotenv'));
const configFile = path.join(backend, '.env.rakshak-test.local');

function stop(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(configFile)) {
  stop('Missing backend/.env.rakshak-test.local. No servers started. See scripts/RAKSHAK_TEST_SETUP.md.');
}
const config = dotenv.parse(fs.readFileSync(configFile));
if (config.SUPABASE_URL !== 'https://uqwadqaztdplxujulbon.supabase.co') {
  stop('Test configuration must target the verified rakshak-test project. No servers started.');
}
for (const key of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!config[key]?.trim() || /placeholder|replace|your[_ -]/i.test(config[key])) {
    stop(`Missing usable ${key} in isolated test configuration. No servers started.`);
  }
}
// This is an operator attestation, not automatic proof of schema or data safety.
if (config.RAKSHAK_TEST_ENV_VERIFIED !== 'yes') {
  stop('Verify schema, account roles and permission to use synthetic records before setting RAKSHAK_TEST_ENV_VERIFIED=yes. No servers started.');
}

const children = [];
function launch(cwd, entry, args, overrides) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...overrides },
  });
  children.push(child);
  child.on('error', () => {
    console.error('A development server could not start.');
    children.forEach((item) => item.kill());
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    children.forEach((item) => { if (item !== child) item.kill(); });
    if (code) process.exitCode = code;
  });
}
// Run with dotenv preloading disabled: the isolated values are already supplied.
// Replace server.js's dotenv loader with a no-op so production .env is never read.
launch(backend, '-e', [
  "require('dotenv').config = () => ({ parsed: {} }); require('./server.js');",
], { ...config, PORT: '5001' });
launch(frontend, path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js'), [
  '--host', '127.0.0.1', '--port', '5173', '--strictPort',
], { VITE_API_BASE_URL: 'http://localhost:5001' });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { children.forEach((child) => child.kill()); });
}
