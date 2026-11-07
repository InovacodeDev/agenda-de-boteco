#!/usr/bin/env node
/**
 * CLI do spec-lock. Subcomandos:
 *   verify                         falha se teste travado mudou/sumiu ou teste novo não tem contrato
 *   lock-new [--stage]             congela testes novos (só adiciona; nunca altera entrada existente)
 *   approve <arquivo> --reason "…" re-trava um teste alterado — só humano, em terminal interativo
 *   gate --base <ref>              compara o lock do HEAD com o da base (gate de PR)
 *
 * `approve` recusa CI e stdin sem TTY de propósito: agentes de IA rodam sem
 * terminal interativo, então não conseguem aprovar a própria mudança de spec.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import { addNew, approve, diffAgainstBase, isTestFile, sha256, verify } from './lib.mjs';

const LOCK_PATH = '.github/test-lock.json';
const APPROVE_HINT =
  'Mudança de especificação exige aprovação humana: pnpm test:approve-spec-change <arquivo> --reason "<motivo>" (e a label spec-change-approved no PR).';

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function repoRoot() {
  return git(['rev-parse', '--show-toplevel']).trim();
}

function emptyLock() {
  return { version: 1, files: {} };
}

function readLock() {
  if (!existsSync(LOCK_PATH)) return emptyLock();
  return JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
}

function writeLock(lock) {
  writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
}

function currentTestFiles() {
  const listed = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0')
    .filter((path) => path && isTestFile(path) && existsSync(path));
  return new Map(listed.map((path) => [path, sha256(readFileSync(path))]));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function flag(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function cmdVerify() {
  const { violations } = verify(readLock(), currentTestFiles(), (path) => readFileSync(path, 'utf8'));
  if (violations.length === 0) {
    console.log('spec-lock: nenhum teste travado foi alterado.');
    return 0;
  }
  for (const { path, kind } of violations) {
    console.error(`SPEC-LOCK ${kind}: ${path}`);
  }
  if (violations.some(({ kind }) => kind === 'missing-contract')) {
    console.error(
      "Teste novo precisa dos blocos describe('Regra de negócio: …') e describe('Tratamento de erro: …').",
    );
  }
  if (violations.some(({ kind }) => kind !== 'missing-contract')) {
    console.error(APPROVE_HINT);
  }
  return 1;
}

function cmdLockNew(args) {
  const { lock, added } = addNew(readLock(), currentTestFiles(), today());
  if (added.length === 0) {
    console.log('spec-lock: nenhum teste novo para travar.');
    return 0;
  }
  writeLock(lock);
  for (const path of added) console.log(`spec-lock: travado ${path}`);
  if (args.includes('--stage')) git(['add', LOCK_PATH]);
  return 0;
}

async function cmdApprove(args) {
  if (process.env.CI || !process.stdin.isTTY) {
    console.error('approve exige terminal interativo de um humano (recusado em CI e sem TTY).');
    return 2;
  }
  const path = args[0];
  const reason = flag(args, '--reason');
  if (!path || path.startsWith('--') || !reason || reason.trim() === '') {
    console.error('uso: approve <arquivo> --reason "<motivo>"');
    return 2;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = await rl.question(`Digite o caminho do arquivo para confirmar (${path}): `);
  rl.close();
  if (typed.trim() !== path) {
    console.error('Confirmação não confere. Nada foi alterado.');
    return 2;
  }
  const hash = existsSync(path) ? sha256(readFileSync(path)) : null;
  const lock = readLock();
  if (!hash && path in lock.files) {
    const { [path]: _removed, ...files } = lock.files;
    writeLock({ ...lock, files });
    console.log(`spec-lock: remoção aprovada de ${path} (${reason.trim()}).`);
    return 0;
  }
  writeLock(approve(lock, path, hash, reason, today()));
  console.log(`spec-lock: ${path} re-travado.`);
  return 0;
}

function cmdGate(args) {
  const base = flag(args, '--base');
  if (!base) {
    console.error('uso: gate --base <ref>');
    return 2;
  }
  let baseLock;
  try {
    baseLock = JSON.parse(git(['show', `${base}:${LOCK_PATH}`]));
  } catch {
    console.log(`spec-lock: base ${base} não tem ${LOCK_PATH} — nada a comparar.`);
    return 0;
  }
  const { changed, removed } = diffAgainstBase(baseLock, readLock());
  const verifyCode = cmdVerify();
  if (changed.length === 0 && removed.length === 0 && verifyCode === 0) {
    console.log('spec-lock: nenhum teste travado na base foi alterado neste PR.');
    return 0;
  }
  for (const path of changed) console.error(`SPEC-LOCK changed-in-pr: ${path}`);
  for (const path of removed) console.error(`SPEC-LOCK removed-in-pr: ${path}`);
  return 1;
}

async function main() {
  process.chdir(repoRoot());
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'verify':
      return cmdVerify();
    case 'lock-new':
      return cmdLockNew(args);
    case 'approve':
      return cmdApprove(args);
    case 'gate':
      return cmdGate(args);
    default:
      console.error('uso: cli.mjs <verify|lock-new|approve|gate> [...]');
      return 2;
  }
}

process.exitCode = await main();
