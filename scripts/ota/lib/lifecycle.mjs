const PREVIEW_CHANNELS = ['alfa', 'beta'];

export function buildLifecycleRules(appSlugs, days) {
  if (!Array.isArray(appSlugs) || appSlugs.length === 0) {
    throw new Error('appSlugs must be a non-empty array');
  }
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('days must be a positive integer');
  }

  const rules = [];
  for (const slug of appSlugs) {
    for (const channel of PREVIEW_CHANNELS) {
      rules.push({
        ID: `expire-${slug}-${channel}`,
        Status: 'Enabled',
        Filter: {
          Prefix: `ota/${slug}/${channel}/`,
        },
        Expiration: {
          Days: days,
        },
      });
    }
  }
  return rules;
}
