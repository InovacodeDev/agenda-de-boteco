import crypto from 'node:crypto';
import { parseArgs } from 'node:util';

import { buildRollbackRow } from './lib/rollback.mjs';
import {
  getSupabaseRestConfig,
  insertRelease,
  listActiveReleases,
} from './lib/supabase-rest.mjs';

const SLUG_BY_APP = {
  'apps/mobile': 'agenda-de-boteco',
  'agenda-de-boteco': 'agenda-de-boteco',
  '@agenda/mobile': 'agenda-de-boteco',
  'apps/mobile-client': 'agenda-de-boteco-client',
  'agenda-de-boteco-client': 'agenda-de-boteco-client',
  '@agenda/mobile-client': 'agenda-de-boteco-client',
};
const ALLOWED_CHANNELS = new Set(['alfa', 'beta', 'production']);

function resolvePlatforms(rawPlatform) {
  if (!rawPlatform || rawPlatform === 'all') {
    return ['ios', 'android'];
  }
  if (rawPlatform === 'ios' || rawPlatform === 'android') {
    return [rawPlatform];
  }
  throw new Error(`Invalid --platform value: ${rawPlatform}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: 'string' },
      channel: { type: 'string' },
      platform: { type: 'string' },
      runtime: { type: 'string' },
      embedded: { type: 'boolean', default: false },
    },
  });

  if (!values.app || !values.channel) {
    throw new Error(
      'Usage: rollback.mjs --app <slug|dir> --channel <alfa|beta|production> [--platform <ios|android|all>] [--runtime <version>] [--embedded]',
    );
  }

  const appSlug = SLUG_BY_APP[values.app.trim().replace(/\/+$/, '')];
  if (!appSlug) {
    throw new Error(`Unsupported --app value: ${values.app}`);
  }
  if (!ALLOWED_CHANNELS.has(values.channel)) {
    throw new Error(`Invalid channel: ${values.channel}`);
  }

  const platforms = resolvePlatforms(values.platform);
  const mode = values.embedded ? 'embedded' : 'previous';
  const gitSha = process.env.GITHUB_SHA || 'rollback';
  const supabaseConfig = getSupabaseRestConfig(process.env);

  for (const platform of platforms) {
    let runtimeVersion = values.runtime?.trim();
    if (!runtimeVersion) {
      const latest = await listActiveReleases(supabaseConfig, {
        appSlug,
        channel: values.channel,
        platform,
        limit: 1,
      });
      if (latest.length === 0) {
        throw new Error(`No active release found for ${appSlug}/${values.channel}/${platform}`);
      }
      runtimeVersion = latest[0].runtime_version;
    }

    const rows = await listActiveReleases(supabaseConfig, {
      appSlug,
      channel: values.channel,
      platform,
      runtimeVersion,
      limit: 5,
    });

    const newRow = buildRollbackRow(rows, {
      mode,
      now: new Date(),
      newId: crypto.randomUUID(),
      gitSha,
    });

    await insertRelease(supabaseConfig, newRow);
    process.stdout.write(
      `Published ${mode} rollback release ${newRow.id} for ${appSlug}/${values.channel}/${platform} (${runtimeVersion})\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(
    `OTA rollback failed: ${err instanceof Error ? err.message : 'unknown error'}\n`,
  );
  process.exit(1);
});
