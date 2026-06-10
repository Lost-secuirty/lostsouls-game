import { spawn } from 'node:child_process';

const port = 3107;
const child = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

async function waitForHealth() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      const text = await res.text();
      if (res.ok && text === 'ok') return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`health check did not pass: ${stderr}`);
}

try {
  await waitForHealth();
} finally {
  child.kill('SIGTERM');
}
