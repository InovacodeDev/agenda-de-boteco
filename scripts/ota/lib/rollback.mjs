function compareCreatedDesc(a, b) {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

export function buildRollbackRow(rows, { mode, now, newId, gitSha }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Nenhuma release anterior para rollback');
  }
  const sorted = [...rows].sort(compareCreatedDesc);

  if (mode === 'embedded') {
    const top = sorted[0];
    return {
      id: newId,
      app_slug: top.app_slug,
      channel: top.channel,
      platform: top.platform,
      runtime_version: top.runtime_version,
      kind: 'rollback_embedded',
      asset_prefix: null,
      manifest: null,
      source_release_id: null,
      git_sha: gitSha,
      created_at: now.toISOString(),
    };
  }

  if (mode !== 'previous') {
    throw new Error(`Modo de rollback inválido: ${mode}`);
  }

  const previous = sorted.slice(1).find((r) => r.kind === 'update' && r.manifest && r.asset_prefix);
  if (!previous) {
    throw new Error('Nenhuma release anterior para rollback');
  }

  return {
    id: newId,
    app_slug: previous.app_slug,
    channel: previous.channel,
    platform: previous.platform,
    runtime_version: previous.runtime_version,
    kind: 'update',
    asset_prefix: previous.asset_prefix,
    manifest: previous.manifest,
    source_release_id: previous.id,
    git_sha: gitSha,
    created_at: now.toISOString(),
  };
}
