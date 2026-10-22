const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Exercise the actual hosted command with CircleCI's Bash error handling.
const config = fs.readFileSync(path.join(__dirname, '../.circleci/config.yml'), 'utf8');
const command = config.split('command: |')[1].split(/\r?\n      - run:/)[0]
  .split(/\r?\n/).map(line => line.replace(/^            /, '')).join('\n');
const formats = ['.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yml', '.eslintrc.yaml'];

function runGuard(filename, lintStatus = 0) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'parking-lint-guard-'));
  try {
    if (filename) fs.writeFileSync(path.join(cwd, filename), '{}');
    return spawnSync('bash', ['-e', '-o', 'pipefail', '-c',
      `yarn() { echo "lint invoked: $*"; return ${lintStatus}; }\n${command}`],
    { cwd, encoding: 'utf8' });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

test.each(formats)('runs lint when only %s exists', filename => {
  const result = runGuard(filename);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('lint invoked: lint');
});

test('fails closed without a supported config', () => {
  const result = runGuard('unrelated.json');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Missing ESLint configuration');
  expect(result.stdout).not.toContain('lint invoked');
});

test('propagates genuine lint failures', () => {
  expect(runGuard('.eslintrc.json', 7).status).toBe(7);
});
