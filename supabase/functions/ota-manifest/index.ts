import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  buildDirectiveBody,
  buildManifestBody,
  buildMultipart,
  isReleaseAlreadyRunning,
  parseManifestRequest,
  type ReleaseRow,
  selectServableRelease,
} from '../_shared/ota/protocol.ts';
import { importSigningKey, signatureHeader } from '../_shared/ota/signing.ts';

let cachedSigningKey: { rawPem: string; key: CryptoKey } | null = null;

async function getSigningKey(rawPem: string): Promise<CryptoKey> {
  if (cachedSigningKey && cachedSigningKey.rawPem === rawPem) {
    return cachedSigningKey.key;
  }
  const key = await importSigningKey(rawPem);
  cachedSigningKey = { rawPem, key };
  return key;
}

function jsonResponse(status: number, payload: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, max-age=0',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const parsedReq = parseManifestRequest(req.headers);
  if (!parsedReq.ok) {
    return jsonResponse(parsedReq.status, { error: parsedReq.reason });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicBaseUrl = Deno.env.get('OTA_PUBLIC_BASE_URL');
  if (!supabaseUrl || !serviceRoleKey || !publicBaseUrl) {
    return jsonResponse(500, { error: 'misconfigured' });
  }

  let selectedReleaseId: string | null = null;
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { appSlug, channel, platform, runtimeVersion, expectSignature } =
      parsedReq.value;

    const { data, error } = await supabase
      .from('ota_releases')
      .select('id, kind, manifest, created_at')
      .eq('app_slug', appSlug)
      .eq('channel', channel)
      .eq('platform', platform)
      .eq('runtime_version', runtimeVersion)
      .is('pruned_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as ReleaseRow[];
    const release = selectServableRelease(rows, channel, new Date());
    if (!release || isReleaseAlreadyRunning(release, parsedReq.value)) {
      return new Response(null, {
        status: 204,
        headers: {
          'expo-protocol-version': '1',
          'cache-control': 'private, max-age=0',
        },
      });
    }

    selectedReleaseId = release.id;
    const isRollback = release.kind === 'rollback_embedded';
    const partName = isRollback ? 'directive' : 'manifest';
    const partBody = isRollback
      ? buildDirectiveBody(release)
      : buildManifestBody(release, runtimeVersion, publicBaseUrl);

    let signature: string | null = null;
    if (expectSignature) {
      const privateKeyPem = Deno.env.get('OTA_PRIVATE_KEY');
      if (!privateKeyPem) {
        return jsonResponse(500, { error: 'signing_key_unavailable' });
      }
      const key = await getSigningKey(privateKeyPem);
      signature = await signatureHeader(key, partBody);
    }

    const boundary = `ota-${crypto.randomUUID()}`;
    const multipart = buildMultipart(
      { name: partName, body: partBody, signature },
      boundary,
    );

    return new Response(multipart, {
      status: 200,
      headers: {
        'content-type': `multipart/mixed; boundary=${boundary}`,
        'expo-protocol-version': '1',
        'expo-sfv-version': '0',
        'cache-control': 'private, max-age=0',
      },
    });
  } catch {
    console.error('OTA manifest failure', {
      method: 'otaManifest.serve',
      releaseId: selectedReleaseId,
    });
    return jsonResponse(500, { error: 'internal_error' });
  }
});
