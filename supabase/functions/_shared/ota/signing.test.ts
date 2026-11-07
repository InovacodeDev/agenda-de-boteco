import assert from 'node:assert/strict';
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

describe('signing', () => {
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
