import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDirectiveBody,
  buildManifestBody,
  buildMultipart,
  parseManifestRequest,
  type ReleaseRow,
  selectServableRelease,
} from './protocol.ts';

function makeHeaders(overrides: Record<string, string | null> = {}): Headers {
  const base: Record<string, string> = {
    'expo-protocol-version': '1',
    'expo-platform': 'ios',
    'expo-runtime-version': 'b97feffb38b7cada4733248989c0094d43a45286',
    'expo-channel-name': 'production',
    'x-app-slug': 'agenda-de-boteco',
    'expo-expect-signature': 'sig, keyid="main", alg="rsa-v1_5-sha256"',
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) {
      delete base[k];
    } else {
      base[k] = v;
    }
  }
  return new Headers(base);
}

const sampleUpdateRow: ReleaseRow = {
  id: '11111111-2222-4333-8444-555555555555',
  kind: 'update',
  created_at: '2026-11-07T12:00:00.000Z',
  manifest: {
    launchAsset: {
      key: 'bundle-key',
      hash: 'bundle-hash',
      contentType: 'application/javascript',
      path: 'ota/agenda-de-boteco/production/rt1/rel1/bundles/ios-entry.hbc',
    },
    assets: [
      {
        key: 'logo-key',
        hash: 'logo-hash',
        contentType: 'image/png',
        fileExtension: '.png',
        path: 'ota/agenda-de-boteco/production/rt1/rel1/assets/logo.png',
      },
      {
        key: 'sourcemap-key',
        hash: 'map-hash',
        contentType: 'application/json',
        fileExtension: '.map',
        path: 'ota/agenda-de-boteco/production/rt1/rel1/bundles/ios-entry.hbc.map',
      },
    ],
    metadata: {},
  },
};

describe('parseManifestRequest', () => {
  it('accepts valid Expo Updates v1 headers with signature expectation', () => {
    const res = parseManifestRequest(
      makeHeaders({ 'expo-current-update-id': 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }),
    );
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.value.appSlug, 'agenda-de-boteco');
      assert.equal(res.value.channel, 'production');
      assert.equal(res.value.platform, 'ios');
      assert.equal(res.value.runtimeVersion, 'b97feffb38b7cada4733248989c0094d43a45286');
      assert.equal(res.value.currentUpdateId, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
      assert.equal(res.value.expectSignature, true);
    }
  });

  it('sets expectSignature=false when expo-expect-signature header is absent', () => {
    const res = parseManifestRequest(makeHeaders({ 'expo-expect-signature': null }));
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.value.expectSignature, false);
      assert.equal(res.value.currentUpdateId, null);
    }
  });

  it('rejects unknown app slug, path traversal channel, invalid platform, protocol 0, and malformed runtime', () => {
    const badCases: Array<Record<string, string | null>> = [
      { 'x-app-slug': 'evil' },
      { 'x-app-slug': null },
      { 'expo-channel-name': '../production' },
      { 'expo-channel-name': null },
      { 'expo-platform': 'web' },
      { 'expo-protocol-version': '0' },
      { 'expo-runtime-version': '' },
      { 'expo-runtime-version': 'a'.repeat(129) },
      { 'expo-runtime-version': 'abc/def' },
      { 'expo-runtime-version': 'abc..def' },
    ];
    for (const overrides of badCases) {
      const res = parseManifestRequest(makeHeaders(overrides));
      assert.equal(res.ok, false, `Expected rejection for ${JSON.stringify(overrides)}`);
      if (!res.ok) {
        assert.equal(res.status, 400);
      }
    }
  });
});

describe('selectServableRelease', () => {
  it('returns null for empty list', () => {
    assert.equal(selectServableRelease([], 'production', new Date('2026-11-07T12:00:00Z')), null);
  });

  it('ignores release older than 29 days in alfa/beta but serves it in production', () => {
    const now = new Date('2026-11-07T12:00:00.000Z');
    const thirtyDaysAgo: ReleaseRow = {
      ...sampleUpdateRow,
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    assert.equal(selectServableRelease([thirtyDaysAgo], 'alfa', now), null);
    assert.equal(selectServableRelease([thirtyDaysAgo], 'beta', now), null);
    assert.deepEqual(selectServableRelease([thirtyDaysAgo], 'production', now), thirtyDaysAgo);
  });
});

describe('buildManifestBody', () => {
  it('builds Expo Updates v1 manifest with public URLs, strips .map assets, and normalizes trailing slash', () => {
    const body = buildManifestBody(sampleUpdateRow, 'rt-123', 'https://ota.example.com/');
    const parsed = JSON.parse(body);
    assert.equal(parsed.id, sampleUpdateRow.id);
    assert.equal(parsed.createdAt, sampleUpdateRow.created_at);
    assert.equal(parsed.runtimeVersion, 'rt-123');
    assert.equal(
      parsed.launchAsset.url,
      'https://ota.example.com/ota/agenda-de-boteco/production/rt1/rel1/bundles/ios-entry.hbc',
    );
    assert.equal(parsed.assets.length, 1);
    assert.equal(
      parsed.assets[0].url,
      'https://ota.example.com/ota/agenda-de-boteco/production/rt1/rel1/assets/logo.png',
    );
    assert.equal(parsed.assets[0].path, undefined);
    assert.equal(parsed.launchAsset.path, undefined);
  });
});

describe('buildDirectiveBody', () => {
  it('builds rollBackToEmbedded directive with commitTime', () => {
    const row: ReleaseRow = {
      id: '22222222-3333-4444-8555-666666666666',
      kind: 'rollback_embedded',
      manifest: null,
      created_at: '2026-11-07T15:00:00.000Z',
    };
    const parsed = JSON.parse(buildDirectiveBody(row));
    assert.deepEqual(parsed, {
      type: 'rollBackToEmbedded',
      parameters: { commitTime: '2026-11-07T15:00:00.000Z' },
    });
  });
});

describe('buildMultipart', () => {
  it('includes expo-signature header when signed and omits it when null', () => {
    const signed = buildMultipart(
      { name: 'manifest', body: '{"id":"1"}', signature: 'sig="abc==", keyid="main"' },
      'boundary-123',
    );
    assert.match(signed, /content-disposition: form-data; name="manifest"/i);
    assert.match(signed, /content-type: application\/json/i);
    assert.match(signed, /expo-signature: sig="abc==", keyid="main"/);
    assert.ok(signed.endsWith('--boundary-123--\r\n') || signed.endsWith('--boundary-123--'));

    const unsigned = buildMultipart(
      { name: 'directive', body: '{"type":"rollBackToEmbedded"}', signature: null },
      'boundary-123',
    );
    assert.doesNotMatch(unsigned, /expo-signature:/i);
    assert.match(unsigned, /content-disposition: form-data; name="directive"/i);
  });
});
