const { existsSync, readFileSync } = require('fs');
const { delimiter, join, resolve } = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
let envFile;
const pythonArgs = [];

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--env') {
    envFile = args[i + 1];
    i += 1;
  } else {
    pythonArgs.push(args[i]);
  }
}

function loadEnvFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

function getPythonCommand() {
  const venvPython =
    process.platform === 'win32'
      ? join('.venv', 'Scripts', 'python.exe')
      : join('.venv', 'bin', 'python');

  if (existsSync(venvPython)) {
    return venvPython;
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

const env = {
  ...loadEnvFile(envFile),
  ...process.env,
  PYTHONPATH: [resolve('src'), process.env.PYTHONPATH].filter(Boolean).join(delimiter),
};

const result = spawnSync(getPythonCommand(), pythonArgs, {
  stdio: 'inherit',
  env,
});

process.exit(result.status ?? 1);
