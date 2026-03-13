import { spawnSync } from 'node:child_process';

function commandExists(cmd) {
  const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return res.status === 0;
}

function run(command, args) {
  const res = spawnSync(command, args, { stdio: 'inherit' });
  process.exitCode = res.status ?? 1;
}

const args = process.argv.slice(2);

if (commandExists('docker')) {
  run('docker', ['compose', ...args]);
} else if (commandExists('podman')) {
  run('podman', ['compose', ...args]);
} else {
  console.error('Neither docker nor podman was found in PATH.');
  process.exitCode = 1;
}

