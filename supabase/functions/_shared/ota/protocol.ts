export const APP_SLUGS = ['agenda-de-boteco', 'agenda-de-boteco-client'] as const;
export const CHANNELS = ['alfa', 'beta', 'production'] as const;
export const PLATFORMS = ['ios', 'android'] as const;
export const PREVIEW_CHANNEL_MAX_AGE_DAYS = 29;

export type AppSlug = (typeof APP_SLUGS)[number];
export type Channel = (typeof CHANNELS)[number];
export type Platform = (typeof PLATFORMS)[number];

export interface ManifestRequest {
  appSlug: AppSlug;
  channel: Channel;
  platform: Platform;
  runtimeVersion: string;
  currentUpdateId: string | null;
  expectSignature: boolean;
}

export interface StoredAsset {
  key: string;
  hash: string;
  contentType: string;
  fileExtension?: string;
  path: string;
}

export interface StoredManifest {
  launchAsset: StoredAsset;
  assets: StoredAsset[];
  metadata: Record<string, string>;
}

export interface ReleaseRow {
  id: string;
  kind: 'update' | 'rollback_embedded';
  manifest: StoredManifest | null;
  created_at: string;
}

const RUNTIME_VERSION_PATTERN = /^(?!.*\.\.)[A-Za-z0-9._-]{1,128}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isAppSlug(value: string | null): value is AppSlug {
  return value !== null && (APP_SLUGS as readonly string[]).includes(value);
}

function isChannel(value: string | null): value is Channel {
  return value !== null && (CHANNELS as readonly string[]).includes(value);
}

function isPlatform(value: string | null): value is Platform {
  return value !== null && (PLATFORMS as readonly string[]).includes(value);
}

export function parseManifestRequest(
  headers: Headers,
): { ok: true; value: ManifestRequest } | { ok: false; status: 400; reason: string } {
  const protocolVersion = headers.get('expo-protocol-version');
  if (protocolVersion !== '1') {
    return { ok: false, status: 400, reason: 'invalid_protocol_version' };
  }

  const appSlug = headers.get('x-app-slug');
  if (!isAppSlug(appSlug)) {
    return { ok: false, status: 400, reason: 'invalid_app_slug' };
  }

  const channel = headers.get('expo-channel-name');
  if (!isChannel(channel)) {
    return { ok: false, status: 400, reason: 'invalid_channel' };
  }

  const platform = headers.get('expo-platform');
  if (!isPlatform(platform)) {
    return { ok: false, status: 400, reason: 'invalid_platform' };
  }

  const runtimeVersion = headers.get('expo-runtime-version') ?? '';
  if (!RUNTIME_VERSION_PATTERN.test(runtimeVersion)) {
    return { ok: false, status: 400, reason: 'invalid_runtime_version' };
  }

  const rawCurrentUpdateId = headers.get('expo-current-update-id')?.trim() ?? '';
  const currentUpdateId = rawCurrentUpdateId.length > 0 ? rawCurrentUpdateId : null;
  const expectSignatureHeader = headers.get('expo-expect-signature');
  const expectSignature =
    expectSignatureHeader !== null && expectSignatureHeader.trim().length > 0;

  return {
    ok: true,
    value: {
      appSlug,
      channel,
      platform,
      runtimeVersion,
      currentUpdateId,
      expectSignature,
    },
  };
}

export function selectServableRelease(
  rows: readonly ReleaseRow[],
  channel: Channel,
  now: Date,
): ReleaseRow | null {
  const maxAgeMs = PREVIEW_CHANNEL_MAX_AGE_DAYS * DAY_MS;
  const nowMs = now.getTime();

  for (const row of rows) {
    if (row.kind === 'update' && !row.manifest) {
      continue;
    }
    if (channel !== 'production') {
      const createdMs = Date.parse(row.created_at);
      if (Number.isNaN(createdMs) || nowMs - createdMs > maxAgeMs) {
        continue;
      }
    }
    return row;
  }

  return null;
}

function isSourceMapAsset(asset: StoredAsset): boolean {
  return (
    asset.fileExtension === '.map' ||
    asset.path.toLowerCase().endsWith('.map')
  );
}

function toPublicAsset(asset: StoredAsset, baseUrl: string) {
  const cleanPath = asset.path.replace(/^\/+/, '');
  const out: {
    key: string;
    hash: string;
    contentType: string;
    fileExtension?: string;
    url: string;
  } = {
    key: asset.key,
    hash: asset.hash,
    contentType: asset.contentType,
    url: `${baseUrl}/${cleanPath}`,
  };
  if (asset.fileExtension !== undefined) {
    out.fileExtension = asset.fileExtension;
  }
  return out;
}

export function buildManifestBody(
  row: ReleaseRow,
  runtimeVersion: string,
  publicBaseUrl: string,
): string {
  if (!row.manifest) {
    throw new Error('Release row has no manifest');
  }
  const base = publicBaseUrl.replace(/\/+$/, '');
  const launchAsset = toPublicAsset(row.manifest.launchAsset, base);
  const assets = row.manifest.assets
    .filter((asset) => !isSourceMapAsset(asset))
    .map((asset) => toPublicAsset(asset, base));

  return JSON.stringify({
    id: row.id,
    createdAt: row.created_at,
    runtimeVersion,
    launchAsset,
    assets,
    metadata: row.manifest.metadata ?? {},
    extra: {},
  });
}

export function buildDirectiveBody(row: ReleaseRow): string {
  return JSON.stringify({
    type: 'rollBackToEmbedded',
    parameters: {
      commitTime: row.created_at,
    },
  });
}

export function buildMultipart(
  part: { name: 'manifest' | 'directive'; body: string; signature: string | null },
  boundary: string,
): string {
  const headers = [
    `--${boundary}`,
    `content-disposition: form-data; name="${part.name}"`,
    'content-type: application/json; charset=utf-8',
  ];
  if (part.signature !== null) {
    headers.push(`expo-signature: ${part.signature}`);
  }
  return `${headers.join('\r\n')}\r\n\r\n${part.body}\r\n--${boundary}--\r\n`;
}
