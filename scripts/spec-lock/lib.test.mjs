import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addNew, approve, diffAgainstBase, isTestFile, sha256, verify } from './lib.mjs';

const CONTRACT = [
  "describe('Regra de negócio: x', () => { it('a', () => { expect(1).toBe(1); }); });",
  "describe('Tratamento de erro: x', () => { it('b', () => { expect(1).toBe(1); }); });",
].join('\n');

const hashOf = (text) => sha256(Buffer.from(text));

function lockWith(files) {
  return {
    version: 1,
    files: Object.fromEntries(
      Object.entries(files).map(([path, content]) => [
        path,
        { sha256: hashOf(content), lockedAt: '2026-11-07', reason: 'initial' },
      ]),
    ),
  };
}

function currentWith(files) {
  return new Map(Object.entries(files).map(([path, content]) => [path, hashOf(content)]));
}

const reader = (files) => (path) => files[path];

describe('Regra de negócio: verify', () => {
  it('aceita arquivo travado sem alteração', () => {
    const files = { 'a.test.ts': 'conteudo' };
    assert.deepEqual(verify(lockWith(files), currentWith(files), reader(files)), { violations: [] });
  });

  it('aceita teste novo com os dois blocos de contrato', () => {
    const locked = { 'a.test.ts': 'conteudo' };
    const files = { ...locked, 'b.test.ts': CONTRACT };
    assert.deepEqual(verify(lockWith(locked), currentWith(files), reader(files)), { violations: [] });
  });

  it('aceita contrato com aspas duplas ou crase', () => {
    const text = 'describe("Regra de negócio: x", f);\ndescribe(`Tratamento de erro: x`, f);';
    const files = { 'b.test.tsx': text };
    assert.deepEqual(verify(lockWith({}), currentWith(files), reader(files)), { violations: [] });
  });

  it('nunca exige contrato de SQL novo', () => {
    const files = { 'supabase/tests/rls.test.sql': 'select plan(1);' };
    assert.deepEqual(verify(lockWith({}), currentWith(files), reader(files)), { violations: [] });
  });
});

describe('Tratamento de erro: verify', () => {
  it('acusa arquivo travado modificado', () => {
    const lock = lockWith({ 'a.test.ts': 'conteudo' });
    const files = { 'a.test.ts': 'conteudo alterado' };
    assert.deepEqual(verify(lock, currentWith(files), reader(files)).violations, [
      { path: 'a.test.ts', kind: 'modified' },
    ]);
  });

  it('acusa arquivo travado removido', () => {
    const lock = lockWith({ 'a.test.ts': 'conteudo' });
    assert.deepEqual(verify(lock, new Map(), reader({})).violations, [
      { path: 'a.test.ts', kind: 'removed' },
    ]);
  });

  it('acusa troca de LF por CRLF como modificação', () => {
    const lock = lockWith({ 'a.test.ts': 'linha1\nlinha2\n' });
    const files = { 'a.test.ts': 'linha1\r\nlinha2\r\n' };
    assert.deepEqual(verify(lock, currentWith(files), reader(files)).violations, [
      { path: 'a.test.ts', kind: 'modified' },
    ]);
  });

  it('trata rename como remoção do arquivo travado', () => {
    const lock = lockWith({ 'a.test.ts': CONTRACT });
    const files = { 'c.test.ts': CONTRACT };
    assert.deepEqual(verify(lock, currentWith(files), reader(files)).violations, [
      { path: 'a.test.ts', kind: 'removed' },
    ]);
  });

  it('acusa teste novo sem bloco de tratamento de erro', () => {
    const files = { 'b.test.ts': "describe('Regra de negócio: x', f);" };
    assert.deepEqual(verify(lockWith({}), currentWith(files), reader(files)).violations, [
      { path: 'b.test.ts', kind: 'missing-contract' },
    ]);
  });
});

describe('Regra de negócio: addNew', () => {
  it('adiciona só caminhos ausentes, ordenados', () => {
    const lock = lockWith({ 'm.test.ts': 'x' });
    const current = currentWith({ 'm.test.ts': 'x', 'z.test.ts': 'z', 'b.test.ts': 'b' });
    const { lock: next, added } = addNew(lock, current, '2026-11-08');
    assert.deepEqual(added, ['b.test.ts', 'z.test.ts']);
    assert.deepEqual(Object.keys(next.files), ['b.test.ts', 'm.test.ts', 'z.test.ts']);
    assert.equal(next.files['b.test.ts'].lockedAt, '2026-11-08');
  });
});

describe('Tratamento de erro: addNew', () => {
  it('nunca sobrescreve hash de entrada existente', () => {
    const lock = lockWith({ 'a.test.ts': 'original' });
    const current = currentWith({ 'a.test.ts': 'alterado' });
    const { lock: next, added } = addNew(lock, current, '2026-11-08');
    assert.deepEqual(added, []);
    assert.equal(next.files['a.test.ts'].sha256, hashOf('original'));
  });
});

describe('Regra de negócio: approve', () => {
  it('atualiza só a entrada pedida e grava o motivo', () => {
    const lock = lockWith({ 'a.test.ts': 'old', 'b.test.ts': 'b' });
    const next = approve(lock, 'a.test.ts', hashOf('new'), 'regra mudou', '2026-11-09');
    assert.deepEqual(next.files['a.test.ts'], {
      sha256: hashOf('new'),
      lockedAt: '2026-11-09',
      reason: 'regra mudou',
    });
    assert.deepEqual(next.files['b.test.ts'], lock.files['b.test.ts']);
  });
});

describe('Tratamento de erro: approve', () => {
  it('recusa motivo vazio', () => {
    assert.throws(() => approve(lockWith({}), 'a.test.ts', 'h', '  ', '2026-11-09'), /reason/);
  });

  it('recusa arquivo inexistente', () => {
    assert.throws(() => approve(lockWith({}), 'a.test.ts', null, 'x', '2026-11-09'), /a\.test\.ts/);
  });
});

describe('Regra de negócio: diffAgainstBase', () => {
  it('ignora entradas apenas adicionadas no head', () => {
    const base = lockWith({ 'a.test.ts': 'a' });
    const head = lockWith({ 'a.test.ts': 'a', 'b.test.ts': 'b' });
    assert.deepEqual(diffAgainstBase(base, head), { changed: [], removed: [] });
  });
});

describe('Tratamento de erro: diffAgainstBase', () => {
  it('acusa hash alterado e entrada removida', () => {
    const base = lockWith({ 'a.test.ts': 'a', 'b.test.ts': 'b' });
    const head = lockWith({ 'a.test.ts': 'a2' });
    assert.deepEqual(diffAgainstBase(base, head), { changed: ['a.test.ts'], removed: ['b.test.ts'] });
  });
});

describe('Regra de negócio: isTestFile', () => {
  it('reconhece os padrões travados', () => {
    assert.equal(isTestFile('apps/x/Button.test.tsx'), true);
    assert.equal(isTestFile('packages/core/src/a.test.ts'), true);
    assert.equal(isTestFile('e2e/login.spec.ts'), true);
    assert.equal(isTestFile('supabase/tests/rls_events.test.sql'), true);
  });
});

describe('Tratamento de erro: isTestFile', () => {
  it('ignora o que não é teste travado', () => {
    assert.equal(isTestFile('scripts/spec-lock/lib.test.mjs'), false);
    assert.equal(isTestFile('supabase/migrations/2026_a.sql'), false);
    assert.equal(isTestFile('packages/core/src/a.ts'), false);
  });
});
