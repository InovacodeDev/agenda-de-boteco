import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getSupabaseRestConfig, upsertNativeBuild } from './lib/supabase-rest.mjs';

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
const ALLOWED_CHANNELS = new Set(['alfa', 'beta', 'production']);

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

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: 'string' },
      channel: { type: 'string' },
      'build-json': { type: 'string' },
    },
  });

  if (!values.app || !values.channel) {
    throw new Error(
      'Usage: register-native-build.mjs --app <dir|slug> --channel <alfa|beta|production> [--build-json <path>]',
    );
  }

  const appSlug = SLUG_BY_APP[values.app.trim().replace(/\/+$/, '')];
  if (!appSlug) {
    throw new Error(`Unsupported --app value: ${values.app}`);
  }
  if (!ALLOWED_CHANNELS.has(values.channel)) {
    throw new Error(`Invalid channel: ${values.channel}`);
  }

  const appDir = path.resolve(process.cwd(), DIR_BY_SLUG[appSlug]);
  const buildJsonPath =
    values['build-json'] ||
    path.join(process.env.RUNNER_TEMP || '/tmp', 'eas-build.json');

  const rawJson = fs.readFileSync(buildJsonPath, 'utf8');
  const builds = JSON.parse(rawJson);
  if (!Array.isArray(builds) || builds.length === 0) {
    throw new Error(`No builds found in ${buildJsonPath}`);
  }

  const supabaseConfig = getSupabaseRestConfig(process.env);
  for (const build of builds) {
    const rawPlatform = String(build.platform ?? '').toLowerCase();
    if (rawPlatform !== 'ios' && rawPlatform !== 'android') {
      continue;
    }
    const runtimeVersion =
      (typeof build.runtimeVersion === 'string' && build.runtimeVersion.trim()) ||
      resolveRuntimeVersion(appDir, rawPlatform);
    const easBuildId = typeof build.id === 'string' ? build.id : null;

    await upsertNativeBuild(supabaseConfig, {
      appSlug,
      channel: values.channel,
      platform: rawPlatform,
      runtimeVersion,
      easBuildId,
    });

    process.stdout.write(
      `Registered native build in ota_native_builds: ${appSlug}/${values.channel}/${rawPlatform} runtime=${runtimeVersion} buildId=${easBuildId ?? 'none'}\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(
    `Failed to register native build: ${err instanceof Error ? err.message : 'unknown error'}\n`,
  );
  process.exit(1);
});
