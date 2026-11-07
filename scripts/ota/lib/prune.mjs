export const BUCKET_ALERT_BYTES = 1.5 * 1024 ** 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_RETENTION_DAYS = 30;

function compareCreatedDesc(a, b) {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

export function planPrune(
  rows,
  { now = new Date(), keepPerRuntime = 3, retireAfterDays = 90 } = {},
) {
  const nowMs = now.getTime();
  const previewMaxAgeMs = PREVIEW_RETENTION_DAYS * DAY_MS;
  const retireMaxAgeMs = retireAfterDays * DAY_MS;

  const pruneReleaseIds = [];
  const retireRuntimes = [];
  const keptRows = [];
  const prunedProductionRows = [];

  const byTarget = new Map();
  for (const row of rows) {
    if (row.channel === 'alfa' || row.channel === 'beta') {
      const ageMs = nowMs - Date.parse(row.created_at);
      if (ageMs > previewMaxAgeMs) {
        pruneReleaseIds.push(row.id);
      } else {
        keptRows.push(row);
      }
      continue;
    }

    if (row.channel !== 'production') {
      keptRows.push(row);
      continue;
    }

    const targetKey = `${row.app_slug}::${row.channel}::${row.platform}`;
    if (!byTarget.has(targetKey)) {
      byTarget.set(targetKey, new Map());
    }
    const byRuntime = byTarget.get(targetKey);
    if (!byRuntime.has(row.runtime_version)) {
      byRuntime.set(row.runtime_version, []);
    }
    byRuntime.get(row.runtime_version).push(row);
  }

  for (const [, byRuntime] of byTarget.entries()) {
    let newestRuntimeVersion = null;
    let newestRuntimeTimestamp = -Infinity;

    for (const [runtimeVersion, runtimeRows] of byRuntime.entries()) {
      runtimeRows.sort(compareCreatedDesc);
      const topTimestamp = Date.parse(runtimeRows[0].created_at);
      if (topTimestamp > newestRuntimeTimestamp) {
        newestRuntimeTimestamp = topTimestamp;
        newestRuntimeVersion = runtimeVersion;
      }
    }

    for (const [runtimeVersion, runtimeRows] of byRuntime.entries()) {
      const topTimestamp = Date.parse(runtimeRows[0].created_at);
      const isNewestRuntime = runtimeVersion === newestRuntimeVersion;
      const isInactiveEnough = nowMs - topTimestamp > retireMaxAgeMs;

      if (!isNewestRuntime && isInactiveEnough) {
        const sample = runtimeRows[0];
        retireRuntimes.push({
          app_slug: sample.app_slug,
          channel: sample.channel,
          platform: sample.platform,
          runtime_version: runtimeVersion,
        });
        for (const r of runtimeRows) {
          pruneReleaseIds.push(r.id);
          prunedProductionRows.push(r);
        }
        continue;
      }

      const kept = runtimeRows.slice(0, keepPerRuntime);
      const overflow = runtimeRows.slice(keepPerRuntime);
      for (const r of kept) {
        keptRows.push(r);
      }
      for (const r of overflow) {
        pruneReleaseIds.push(r.id);
        prunedProductionRows.push(r);
      }
    }
  }

  const keptPrefixes = new Set();
  for (const r of keptRows) {
    if (r.asset_prefix) {
      keptPrefixes.add(r.asset_prefix);
    }
  }

  const deletePrefixesSet = new Set();
  for (const r of prunedProductionRows) {
    if (r.asset_prefix && !keptPrefixes.has(r.asset_prefix)) {
      deletePrefixesSet.add(r.asset_prefix);
    }
  }

  return {
    pruneReleaseIds,
    deletePrefixes: Array.from(deletePrefixesSet),
    retireRuntimes,
  };
}
