import crypto from 'node:crypto';
import path from 'node:path';

const CONTENT_TYPE_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.hbc': 'application/javascript',
};

function normalizeRelPath(p) {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

function normalizePrefix(prefix) {
  const trimmed = prefix.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed.length > 0 ? `${trimmed}/` : '';
}

function normalizeExt(ext, fallbackPath) {
  if (typeof ext === 'string' && ext.trim().length > 0) {
    const clean = ext.trim().toLowerCase();
    return clean.startsWith('.') ? clean : `.${clean}`;
  }
  return path.posix.extname(fallbackPath).toLowerCase();
}

function isSourceMap(relPath, ext) {
  return (
    relPath.toLowerCase().endsWith('.map') ||
    ext === '.map' ||
    ext === 'map'
  );
}

function computeSha256Base64Url(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('base64url');
}

function computeMd5Hex(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

export function buildStoredManifest({ metadata, platform, files, assetPrefix }) {
  const platformMeta = metadata?.fileMetadata?.[platform];
  if (!platformMeta || typeof platformMeta.bundle !== 'string') {
    throw new Error(`Missing bundle metadata for platform "${platform}"`);
  }

  const normalizedPrefix = normalizePrefix(assetPrefix);
  const bundleRelPath = normalizeRelPath(platformMeta.bundle);
  if (isSourceMap(bundleRelPath, '')) {
    throw new Error('Launch bundle cannot be a source map');
  }

  const bundleBuffer = files.get(bundleRelPath);
  if (!bundleBuffer) {
    throw new Error(`Missing bundle file in export output: ${bundleRelPath}`);
  }

  const bundleFileName = path.posix.basename(bundleRelPath);
  const bundleRemoteKey = `${normalizedPrefix}bundles/${bundleFileName}`;
  const bundleExt = path.posix.extname(bundleFileName) || '.bundle';

  const launchAsset = {
    key: computeMd5Hex(bundleBuffer),
    hash: computeSha256Base64Url(bundleBuffer),
    contentType: 'application/javascript',
    fileExtension: bundleExt,
    path: bundleRemoteKey,
  };

  const uploads = [
    {
      key: bundleRemoteKey,
      path: bundleRelPath,
      contentType: 'application/javascript',
    },
  ];

  const assets = [];
  const rawAssets = Array.isArray(platformMeta.assets) ? platformMeta.assets : [];

  for (const rawAsset of rawAssets) {
    const relPath = normalizeRelPath(rawAsset.path);
    const ext = normalizeExt(rawAsset.ext, relPath);
    if (isSourceMap(relPath, ext)) {
      continue;
    }

    const buffer = files.get(relPath);
    if (!buffer) {
      throw new Error(`Missing asset file in export output: ${relPath}`);
    }

    const baseName = path.posix.basename(relPath);
    const fileNameWithExt =
      ext && !baseName.toLowerCase().endsWith(ext) ? `${baseName}${ext}` : baseName;
    const remoteKey = `${normalizedPrefix}assets/${fileNameWithExt}`;
    const contentType = CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';

    assets.push({
      key: computeMd5Hex(buffer),
      hash: computeSha256Base64Url(buffer),
      contentType,
      fileExtension: ext || undefined,
      path: remoteKey,
    });

    uploads.push({
      key: remoteKey,
      path: relPath,
      contentType,
    });
  }

  return {
    manifest: {
      launchAsset,
      assets,
      metadata: {},
    },
    uploads,
  };
}
