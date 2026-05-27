const { existsSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getSystemPythonCommand() {
  const candidates = process.platform === 'win32' ? ['python'] : ['python3', 'python'];

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error('Python was not found on PATH');
}

const systemPython = getSystemPythonCommand();
run(systemPython, ['-m', 'venv', '.venv']);

const venvPython =
  process.platform === 'win32'
    ? join('.venv', 'Scripts', 'python.exe')
    : join('.venv', 'bin', 'python');

if (!existsSync(venvPython)) {
  throw new Error(`Expected venv Python at ${venvPython}`);
}

run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt']);
