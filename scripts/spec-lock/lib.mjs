/**
 * Spec-lock: funções puras sobre o manifesto `.github/test-lock.json`.
 *
 * O manifesto congela o SHA-256 de cada arquivo de teste. Arquivo novo é livre
 * (entra no lock no próprio commit); editar ou apagar arquivo já travado exige
 * aprovação humana. O hash é do conteúdo bruto, sem normalizar EOL/whitespace:
 * qualquer byte alterado em teste congelado é mudança de especificação.
 */
import { createHash } from 'node:crypto';

export const TEST_FILE_PATTERNS = Object.freeze([
  /\.test\.tsx?$/,
  /\.spec\.ts$/,
  /^supabase\/tests\/.+\.sql$/,
]);

const CONTRACT_PATTERNS = Object.freeze([
  /describe\(\s*['"`]Regra de negócio:/,
  /describe\(\s*['"`]Tratamento de erro:/,
]);

export function isTestFile(path) {
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(path));
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function needsContract(path) {
  return /\.tsx?$/.test(path);
}

function sortedFiles(files) {
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export function verify(lock, current, readContent) {
  const violations = [];
  for (const [path, entry] of Object.entries(lock.files)) {
    const hash = current.get(path);
    if (hash === undefined) {
      violations.push({ path, kind: 'removed' });
    } else if (hash !== entry.sha256) {
      violations.push({ path, kind: 'modified' });
    }
  }
  for (const path of current.keys()) {
    if (path in lock.files || !needsContract(path)) continue;
    const content = readContent(path);
    if (!CONTRACT_PATTERNS.every((pattern) => pattern.test(content))) {
      violations.push({ path, kind: 'missing-contract' });
    }
  }
  violations.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { violations };
}

export function addNew(lock, current, today) {
  const files = { ...lock.files };
  const added = [];
  for (const [path, hash] of current) {
    if (path in files) continue;
    files[path] = { sha256: hash, lockedAt: today, reason: 'new test file' };
    added.push(path);
  }
  added.sort();
  return { lock: { ...lock, files: sortedFiles(files) }, added };
}

export function approve(lock, path, hash, reason, today) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new Error('approve exige --reason com o motivo da mudança de especificação');
  }
  if (!hash) {
    throw new Error(`arquivo de teste não encontrado: ${path}`);
  }
  const files = { ...lock.files, [path]: { sha256: hash, lockedAt: today, reason: reason.trim() } };
  return { ...lock, files: sortedFiles(files) };
}

export function diffAgainstBase(baseLock, headLock) {
  const changed = [];
  const removed = [];
  for (const [path, entry] of Object.entries(baseLock.files)) {
    const headEntry = headLock.files[path];
    if (!headEntry) {
      removed.push(path);
    } else if (headEntry.sha256 !== entry.sha256) {
      changed.push(path);
    }
  }
  return { changed: changed.sort(), removed: removed.sort() };
}
