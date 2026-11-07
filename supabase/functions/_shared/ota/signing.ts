const PKCS8_HEADER = '-----BEGIN PRIVATE KEY-----';
const PKCS8_FOOTER = '-----END PRIVATE KEY-----';
const PKCS1_HEADER = '-----BEGIN RSA PRIVATE KEY-----';
const PKCS1_FOOTER = '-----END RSA PRIVATE KEY-----';

const RSA_ALGORITHM_IDENTIFIER = new Uint8Array([
  0x02, 0x01, 0x00, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d,
  0x01, 0x01, 0x01, 0x05, 0x00,
]);

function encodeDerLength(length: number): Uint8Array {
  if (length < 0x80) {
    return new Uint8Array([length]);
  }
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function wrapDerTag(tag: number, content: Uint8Array): Uint8Array {
  const lenBytes = encodeDerLength(content.length);
  const out = new Uint8Array(1 + lenBytes.length + content.length);
  out[0] = tag;
  out.set(lenBytes, 1);
  out.set(content, 1 + lenBytes.length);
  return out;
}

function wrapPkcs1InPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  const privateKeyOctetString = wrapDerTag(0x04, pkcs1Der);
  const inner = new Uint8Array(
    RSA_ALGORITHM_IDENTIFIER.length + privateKeyOctetString.length,
  );
  inner.set(RSA_ALGORITHM_IDENTIFIER, 0);
  inner.set(privateKeyOctetString, RSA_ALGORITHM_IDENTIFIER.length);
  return wrapDerTag(0x30, inner);
}

function decodeBase64Strict(b64: string): Uint8Array {
  if (b64.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    throw new Error('Invalid signing key');
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parsePemToPkcs8Der(pemInput: string): Uint8Array {
  const normalized = pemInput.replace(/\\n/g, '\n').trim();
  if (
    normalized.startsWith(PKCS8_HEADER) &&
    normalized.endsWith(PKCS8_FOOTER)
  ) {
    const body = normalized
      .slice(PKCS8_HEADER.length, normalized.length - PKCS8_FOOTER.length)
      .replace(/\s+/g, '');
    return decodeBase64Strict(body);
  }
  if (
    normalized.startsWith(PKCS1_HEADER) &&
    normalized.endsWith(PKCS1_FOOTER)
  ) {
    const body = normalized
      .slice(PKCS1_HEADER.length, normalized.length - PKCS1_FOOTER.length)
      .replace(/\s+/g, '');
    return wrapPkcs1InPkcs8(decodeBase64Strict(body));
  }
  throw new Error('Invalid signing key');
}

export async function importSigningKey(pkcs8Pem: string): Promise<CryptoKey> {
  try {
    const der = parsePemToPkcs8Der(pkcs8Pem);
    const buffer = der.buffer.slice(
      der.byteOffset,
      der.byteOffset + der.byteLength,
    ) as ArrayBuffer;
    return await crypto.subtle.importKey(
      'pkcs8',
      buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign'],
    );
  } catch {
    throw new Error('Invalid signing key');
  }
}

export async function signatureHeader(
  key: CryptoKey,
  body: string,
  keyId = 'main',
): Promise<string> {
  const encoded = new TextEncoder().encode(body);
  const sigBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoded);
  const sigBytes = new Uint8Array(sigBuffer);
  let binary = '';
  for (const byte of sigBytes) {
    binary += String.fromCharCode(byte);
  }
  return `sig="${btoa(binary)}", keyid="${keyId}"`;
}
