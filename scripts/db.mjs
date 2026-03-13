import { spawnSync } from 'node:child_process';

const ENGINE_CONTAINER_NAME = 'yetanothercrm-postgres';
const ENGINE_VOLUME_NAME = 'yetanothercrm_pg';
const ENGINE_IMAGE = 'postgres:16-alpine';

function commandExists(cmd) {
  const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return res.status === 0;
}

function run(command, args, opts = {}) {
  const res = spawnSync(command, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function runQuiet(command, args) {
  const res = spawnSync(command, args, { stdio: 'ignore' });
  return res.status === 0;
}

function resolveEngine() {
  if (commandExists('docker')) return 'docker';
  if (commandExists('podman')) return 'podman';
  throw new Error('Neither docker nor podman was found in PATH.');
}

function ensureVolume(engine) {
  const exists = runQuiet(engine, ['volume', 'inspect', ENGINE_VOLUME_NAME]);
  if (!exists) run(engine, ['volume', 'create', ENGINE_VOLUME_NAME]);
}

function down(engine) {
  runQuiet(engine, ['rm', '-f', ENGINE_CONTAINER_NAME]);
}

function up(engine) {
  ensureVolume(engine);
  if (engine === 'podman') {
    run(engine, [
      'run',
      '-d',
      '--name',
      ENGINE_CONTAINER_NAME,
      '--replace',
      '-p',
      '5432:5432',
      '-e',
      'POSTGRES_USER=postgres',
      '-e',
      'POSTGRES_PASSWORD=postgres',
      '-e',
      'POSTGRES_DB=yetanothercrm',
      '-v',
      `${ENGINE_VOLUME_NAME}:/var/lib/postgresql/data`,
      ENGINE_IMAGE,
    ]);
    return;
  }

  runQuiet(engine, ['rm', '-f', ENGINE_CONTAINER_NAME]);
  run(engine, [
    'run',
    '-d',
    '--name',
    ENGINE_CONTAINER_NAME,
    '-p',
    '5432:5432',
    '-e',
    'POSTGRES_USER=postgres',
    '-e',
    'POSTGRES_PASSWORD=postgres',
    '-e',
    'POSTGRES_DB=yetanothercrm',
    '-v',
    `${ENGINE_VOLUME_NAME}:/var/lib/postgresql/data`,
    ENGINE_IMAGE,
  ]);
}

function main() {
  const action = process.argv[2];
  if (action !== 'up' && action !== 'down') {
    console.error('Usage: node scripts/db.mjs <up|down>');
    process.exit(1);
  }

  const engine = resolveEngine();
  if (action === 'up') up(engine);
  if (action === 'down') down(engine);
}

main();

