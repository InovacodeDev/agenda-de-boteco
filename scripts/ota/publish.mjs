import { PutObjectCommand } from '@aws-sdk/client-s3';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { buildStoredManifest } from './lib/manifest.mjs';
import { createR2Client, getR2Bucket } from './lib/r2.mjs';
import {
  getSupabaseRestConfig,
  hasNativeBuild,
  insertRelease,
} from './lib/supabase-rest.mjs';
import { runPrune } from './prune.mjs';

const PLATFORMS = ['ios', 'android'];
const ALLOWED_CHANNELS = new Set(['alfa', 'beta', 'production']);
const SLUG_BY_APP = {
  'apps/mobile': 'agenda-de-boteco',
  'agenda-de-boteco': 'agenda-de-boteco',
  '@agenda/mobile': 'agenda-de-boteco',
  'apps/mobile-client': 'agenda-de-boteco-client',
  'agenda-de-boteco-client': 'agenda-de-boteco-client',
  '@agenda/mobile-client': 'agenda-de-boteco-client',
};
const DIR_BY_SLUG = {
  'agenda-de-boteco': 'apps/mobile',
  'agenda-de-boteco-client': 'apps/mobile-client',
};

function writeGithubOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    fs.appendFileSync(outputPath, `${key}=${value}\n`, 'utf8');
  }
}

function resolveAppTarget(rawApp) {
  const normalized = rawApp?.trim().replace(/\/+$/, '');
  const appSlug = SLUG_BY_APP[normalized];
  if (!appSlug) {
    throw new Error(`Unsupported --app value: ${rawApp}`);
  }
  const appDir = path.resolve(process.cwd(), DIR_BY_SLUG[appSlug]);
  return { appSlug, appDir };
}

function resolveRuntimeVersion(appDir, platform) {
  const stdout = execFileSync(
    'npx',
    ['expo-updates', 'runtimeversion:resolve', '--platform', platform],
    {
      cwd: appDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const parsed = JSON.parse(stdout.trim());
  if (!parsed?.runtimeVersion || typeof parsed.runtimeVersion !== 'string') {
    throw new Error(`Unable to resolve runtimeVersion for ${platform}`);
  }
  return parsed.runtimeVersion;
}

function readDirectoryFiles(rootDir, currentDir = rootDir, out = new Map()) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      readDirectoryFiles(rootDir, fullPath, out);
    } else if (entry.isFile()) {
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
      out.set(relPath, fs.readFileSync(fullPath));
    }
  }
  return out;
}

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: 'string' },
      channel: { type: 'string' },
    },
  });

  if (!values.app || !values.channel) {
    throw new Error('Usage: publish.mjs --app <dir|slug> --channel <alfa|beta|production>');
  }
  if (!ALLOWED_CHANNELS.has(values.channel)) {
    throw new Error(`Invalid channel: ${values.channel}`);
  }

  const { appSlug, appDir } = resolveAppTarget(values.app);
  const channel = values.channel;
  const supabaseConfig = getSupabaseRestConfig(process.env);

  const runtimeByPlatform = new Map();
  for (const platform of PLATFORMS) {
    const runtimeVersion = resolveRuntimeVersion(appDir, platform);
    runtimeByPlatform.set(platform, runtimeVersion);
    const exists = await hasNativeBuild(supabaseConfig, {
      appSlug,
      channel,
      platform,
      runtimeVersion,
    });
    if (!exists) {
      writeGithubOutput('needs_native_build', 'true');
      process.stdout.write(
        `Runtime ${runtimeVersion} (${appSlug}/${channel}/${platform}) not found in ota_native_builds; native build required.\n`,
      );
      process.exit(78);
    }
  }

  writeGithubOutput('needs_native_build', 'false');

  const r2Client = createR2Client(process.env);
  const bucket = getR2Bucket(process.env);
  const gitSha = process.env.GITHUB_SHA || 'local';
  const publishedIds = [];

  for (const platform of PLATFORMS) {
    const runtimeVersion = runtimeByPlatform.get(platform);
    const outputRelDir = path.join('dist-ota', platform);
    const outputAbsDir = path.join(appDir, outputRelDir);
    fs.rmSync(outputAbsDir, { recursive: true, force: true });

    execFileSync(
      'npx',
      ['expo', 'export', '--platform', platform, '--dump-sourcemap', '--output-dir', outputRelDir],
      {
        cwd: appDir,
        stdio: 'inherit',
      },
    );

    if (process.env.POSTHOG_CLI_TOKEN) {
      execFileSync(
        'npx',
        ['@posthog/cli', 'hermes', 'upload', '--directory', outputRelDir],
        {
          cwd: appDir,
          stdio: 'inherit',
        },
      );
    } else {
      process.stdout.write(
        `Skipping PostHog source map upload for ${appSlug}/${platform}: POSTHOG_CLI_TOKEN not set.\n`,
      );
    }

    const metadataRaw = fs.readFileSync(path.join(outputAbsDir, 'metadata.json'), 'utf8');
    const metadata = JSON.parse(metadataRaw);
    const files = readDirectoryFiles(outputAbsDir);

    const releaseId = crypto.randomUUID();
    const assetPrefix = `ota/${appSlug}/${channel}/${runtimeVersion}/${releaseId}/`;
    const { manifest, uploads } = buildStoredManifest({
      metadata,
      platform,
      files,
      assetPrefix,
    });

    for (const upload of uploads) {
      const body = files.get(upload.path);
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: upload.key,
          Body: body,
          ContentType: upload.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    }

    await insertRelease(supabaseConfig, {
      id: releaseId,
      app_slug: appSlug,
      channel,
      platform,
      runtime_version: runtimeVersion,
      kind: 'update',
      asset_prefix: assetPrefix,
      manifest,
      git_sha: gitSha,
    });

    publishedIds.push(`${platform}:${releaseId}`);
    fs.rmSync(outputAbsDir, { recursive: true, force: true });
  }

  writeGithubOutput('ota_release_ids', publishedIds.join(','));
  process.stdout.write(`Published OTA releases for ${appSlug} (${channel}): ${publishedIds.join(', ')}\n`);

  await runPrune({ env: process.env });
}

main().catch((err) => {
  process.stderr.write(
    `OTA publish failed: ${err instanceof Error ? err.message : 'unknown error'}\n`,
  );
  process.exit(1);
});
