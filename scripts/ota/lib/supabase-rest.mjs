import { getRequiredEnv } from './r2.mjs';

export function getSupabaseRestConfig(env = process.env) {
  const baseUrl = getRequiredEnv(env, 'SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  return { baseUrl, serviceRoleKey };
}

async function supabaseRestFetch(config, table, { method = 'GET', query, body, prefer } = {}) {
  const url = new URL(`${config.baseUrl}/rest/v1/${table}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }

  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${method} ${table} failed with status ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function hasNativeBuild(config, { appSlug, channel, platform, runtimeVersion }) {
  const rows = await supabaseRestFetch(config, 'ota_native_builds', {
    query: {
      select: 'id,retired_at',
      app_slug: `eq.${appSlug}`,
      channel: `eq.${channel}`,
      platform: `eq.${platform}`,
      runtime_version: `eq.${runtimeVersion}`,
      retired_at: 'is.null',
      limit: '1',
    },
  });
  return Array.isArray(rows) && rows.length > 0;
}

export async function upsertNativeBuild(
  config,
  { appSlug, channel, platform, runtimeVersion, easBuildId = null },
) {
  return supabaseRestFetch(config, 'ota_native_builds', {
    method: 'POST',
    query: {
      on_conflict: 'app_slug,channel,platform,runtime_version',
    },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      app_slug: appSlug,
      channel,
      platform,
      runtime_version: runtimeVersion,
      eas_build_id: easBuildId,
      retired_at: null,
    },
  });
}

export async function insertRelease(config, row) {
  return supabaseRestFetch(config, 'ota_releases', {
    method: 'POST',
    prefer: 'return=representation',
    body: row,
  });
}

export async function listActiveReleases(config, filters = {}) {
  const query = {
    select: 'id,app_slug,channel,platform,runtime_version,kind,asset_prefix,manifest,created_at',
    pruned_at: 'is.null',
    order: 'created_at.desc',
  };
  if (filters.appSlug) query.app_slug = `eq.${filters.appSlug}`;
  if (filters.channel) query.channel = `eq.${filters.channel}`;
  if (filters.platform) query.platform = `eq.${filters.platform}`;
  if (filters.runtimeVersion) query.runtime_version = `eq.${filters.runtimeVersion}`;
  if (filters.limit) query.limit = String(filters.limit);

  const rows = await supabaseRestFetch(config, 'ota_releases', { query });
  return Array.isArray(rows) ? rows : [];
}

export async function markReleasesPruned(config, releaseIds, prunedAtIso) {
  if (!Array.isArray(releaseIds) || releaseIds.length === 0) {
    return;
  }
  await supabaseRestFetch(config, 'ota_releases', {
    method: 'PATCH',
    query: {
      id: `in.(${releaseIds.join(',')})`,
    },
    body: {
      pruned_at: prunedAtIso,
    },
  });
}

export async function markRuntimeRetired(
  config,
  { app_slug, channel, platform, runtime_version },
  retiredAtIso,
) {
  await supabaseRestFetch(config, 'ota_native_builds', {
    method: 'PATCH',
    query: {
      app_slug: `eq.${app_slug}`,
      channel: `eq.${channel}`,
      platform: `eq.${platform}`,
      runtime_version: `eq.${runtime_version}`,
    },
    body: {
      retired_at: retiredAtIso,
    },
  });
}
