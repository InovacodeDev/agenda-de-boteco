import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const CONTRACT = [
  "describe('Regra de negócio: x', () => { it('a', () => { expect(1).toBe(1); }); });",
  "describe('Tratamento de erro: x', () => { it('b', () => { expect(1).toBe(1); }); });",
  '',
].join('\n');

let repo;

function git(...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function cli(args, env = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, CI: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

function readLock() {
  return JSON.parse(readFileSync(join(repo, '.github/test-lock.json'), 'utf8'));
}

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'spec-lock-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  execFileSync('mkdir', ['-p', join(repo, '.github')]);
  writeFileSync(join(repo, 'README'), 'base\n');
  git('add', '.');
  git('commit', '-qm', 'base without lock');
  git('tag', 'no-lock');
  writeFileSync(join(repo, 'a.test.ts'), CONTRACT);
  assert.equal(cli(['lock-new']).code, 0);
  git('add', '.');
  git('commit', '-qm', 'lock a');
});

after(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('Regra de negócio: CLI no pre-commit lê o que vai ser commitado', () => {
  it('ignora teste não rastreado em verify --staged', () => {
    writeFileSync(join(repo, 'wip.test.ts'), "it('wip', () => {});\n");
    try {
      assert.equal(cli(['verify', '--staged']).code, 0);
    } finally {
      rmSync(join(repo, 'wip.test.ts'));
    }
  });

  it('lock-new --staged não trava teste não rastreado', () => {
    writeFileSync(join(repo, 'wip.test.ts'), CONTRACT);
    try {
      assert.equal(cli(['lock-new', '--staged']).code, 0);
      assert.equal('wip.test.ts' in readLock().files, false);
    } finally {
      rmSync(join(repo, 'wip.test.ts'));
      git('checkout', '--', '.github/test-lock.json');
    }
  });

  it('gate passa quando a base não tem lock', () => {
    assert.equal(cli(['gate', '--base', 'no-lock']).code, 0);
  });
});

describe('Tratamento de erro: CLI no pre-commit e no gate', () => {
  it('verify --staged acusa teste travado alterado no índice e restaurado na árvore', () => {
    writeFileSync(join(repo, 'a.test.ts'), `${CONTRACT}// alterado\n`);
    git('add', 'a.test.ts');
    writeFileSync(join(repo, 'a.test.ts'), CONTRACT);
    try {
      const { code, out } = cli(['verify', '--staged']);
      assert.equal(code, 1);
      assert.match(out, /SPEC-LOCK modified: a\.test\.ts/);
    } finally {
      git('reset', '-q', 'a.test.ts');
    }
  });

  it('gate falha com ref de base inexistente', () => {
    assert.equal(cli(['gate', '--base', 'nao-existe']).code, 2);
  });

  it('gate retorna 3 quando teste travado muda sem atualizar o lock', () => {
    writeFileSync(join(repo, 'a.test.ts'), `${CONTRACT}// sem approve\n`);
    try {
      assert.equal(cli(['gate', '--base', 'HEAD']).code, 3);
    } finally {
      writeFileSync(join(repo, 'a.test.ts'), CONTRACT);
    }
  });

  it('approve recusa em CI sem tocar o lock', () => {
    const before = readFileSync(join(repo, '.github/test-lock.json'), 'utf8');

    const { code } = cli(['approve', 'a.test.ts', '--reason', 'x'], { CI: 'true' });

    assert.equal(code, 2);
    assert.equal(readFileSync(join(repo, '.github/test-lock.json'), 'utf8'), before);
  });
});
