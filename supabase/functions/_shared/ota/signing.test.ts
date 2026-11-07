import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import { importSigningKey, signatureHeader } from './signing.ts';

function arrayBufferToPem(buffer: ArrayBuffer, label: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const b64 = btoa(binary);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

describe('Regra de negócio: assinatura RSA-SHA256 de manifest OTA', () => {
  it('imports PKCS#8 PEM and produces a verifiable RSA-SHA256 expo-signature header', async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const pem = arrayBufferToPem(pkcs8, 'PRIVATE KEY');

    const signingKey = await importSigningKey(pem);
    const body = '{"a":1,"b":"hello"}';
    const header = await signatureHeader(signingKey, body);

    assert.match(header, /^sig="([A-Za-z0-9+/=]+)", keyid="main"$/);
    const match = /^sig="([A-Za-z0-9+/=]+)", keyid="main"$/.exec(header);
    assert.ok(match);
    const sigB64 = match[1] ?? '';
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));

    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      keyPair.publicKey,
      sigBytes,
      new TextEncoder().encode(body),
    );
    assert.equal(verified, true);
  });

  it('imports PKCS#1 RSA PRIVATE KEY PEM with escaped newlines and produces verifiable signature', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const pkcs1Pem = privateKey
      .export({ type: 'pkcs1', format: 'pem' })
      .toString()
      .replace(/\n/g, '\\n');

    const signingKey = await importSigningKey(pkcs1Pem);
    const body = '{"id":"pkcs1-test"}';
    const header = await signatureHeader(signingKey, body);
    const match = /^sig="([A-Za-z0-9+/=]+)", keyid="main"$/.exec(header);
    assert.ok(match);
    const sigBytes = Buffer.from(match[1] ?? '', 'base64');
    const verified = crypto.verify(
      'RSA-SHA256',
      Buffer.from(body),
      publicKey,
      sigBytes,
    );
    assert.equal(verified, true);
  });
});

describe('Tratamento de erro: chave PEM inválida sem vazar segredo', () => {
  it('rejects invalid PEM without leaking the input in the error message', async () => {
    const secretMarker = 'SUPER_SECRET_MATERIAL_DO_NOT_LEAK';
    await assert.rejects(
      () => importSigningKey(`not-a-valid-pem-${secretMarker}`),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message.includes(secretMarker), false);
        return true;
      },
    );
  });
});
