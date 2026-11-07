import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import { buildStoredManifest } from '../lib/manifest.mjs';

const fixtureMetadata = {
  version: 0,
  bundler: 'metro',
  fileMetadata: {
    ios: {
      bundle: '_expo/static/js/ios/entry-abc.hbc',
      assets: [
        { path: 'assets/4f3a9c1b2d', ext: 'png' },
        { path: 'assets/9b8e7d6c5a.ttf', ext: 'ttf' },
      ],
    },
    android: {
      bundle: '_expo/static/js/android/entry-def.hbc',
      assets: [{ path: 'assets/4f3a9c1b2d', ext: 'png' }],
    },
  },
};

function makeFiles() {
  return new Map([
    ['_expo/static/js/ios/entry-abc.hbc', Buffer.from('ios-hermes-bytecode')],
    ['_expo/static/js/ios/entry-abc.hbc.map', Buffer.from('{"version":3}')],
    ['_expo/static/js/android/entry-def.hbc', Buffer.from('android-hermes-bytecode')],
    ['assets/4f3a9c1b2d', Buffer.from('png-binary-data')],
    ['assets/9b8e7d6c5a.ttf', Buffer.from('ttf-font-data')],
  ]);
}

describe('buildStoredManifest', () => {
  it('builds iOS manifest with base64url SHA-256 hash, derived contentType, preserved extensions, and excludes .map', () => {
    const files = makeFiles();
    const assetPrefix = 'ota/agenda-de-boteco/production/rt1/rel1/';
    const { manifest, uploads } = buildStoredManifest({
      metadata: fixtureMetadata,
      platform: 'ios',
      files,
      assetPrefix,
    });

    const expectedBundleHash = crypto
      .createHash('sha256')
      .update(Buffer.from('ios-hermes-bytecode'))
      .digest('base64url');
    assert.equal(manifest.launchAsset.hash, expectedBundleHash);
    assert.equal(manifest.launchAsset.contentType, 'application/javascript');
    assert.equal(
      manifest.launchAsset.path,
      'ota/agenda-de-boteco/production/rt1/rel1/bundles/entry-abc.hbc',
    );

    assert.equal(manifest.assets.length, 2);
    assert.equal(manifest.assets[0].contentType, 'image/png');
    assert.equal(manifest.assets[0].fileExtension, '.png');
    assert.ok(manifest.assets[0].path.startsWith(assetPrefix));
    assert.ok(manifest.assets[0].path.endsWith('.png'));

    assert.equal(manifest.assets[1].contentType, 'font/ttf');
    assert.equal(manifest.assets[1].fileExtension, '.ttf');
    assert.ok(manifest.assets[1].path.startsWith(assetPrefix));
    assert.ok(manifest.assets[1].path.endsWith('.ttf'));

    for (const asset of manifest.assets) {
      assert.equal(asset.path.endsWith('.map'), false);
    }
    for (const upload of uploads) {
      assert.equal(upload.key.endsWith('.map'), false);
      assert.equal(upload.path.endsWith('.map'), false);
    }
    assert.equal(uploads.length, 3);
  });

  it('reads fileMetadata.android when platform is android', () => {
    const files = makeFiles();
    const assetPrefix = 'ota/agenda-de-boteco/production/rt1/rel2/';
    const { manifest, uploads } = buildStoredManifest({
      metadata: fixtureMetadata,
      platform: 'android',
      files,
      assetPrefix,
    });

    assert.equal(
      manifest.launchAsset.path,
      'ota/agenda-de-boteco/production/rt1/rel2/bundles/entry-def.hbc',
    );
    assert.equal(manifest.assets.length, 1);
    assert.equal(uploads.length, 2);
  });
});
