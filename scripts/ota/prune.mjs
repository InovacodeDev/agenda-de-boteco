import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { pathToFileURL } from 'node:url';

import { BUCKET_ALERT_BYTES, planPrune } from './lib/prune.mjs';
import { createR2Client, getR2Bucket } from './lib/r2.mjs';
import {
  getSupabaseRestConfig,
  listActiveReleases,
  markReleasesPruned,
  markRuntimeRetired,
} from './lib/supabase-rest.mjs';

const DELETE_BATCH_SIZE = 1000;

async function listKeysUnderPrefix(r2Client, bucket, prefix) {
  const keys = [];
  let continuationToken;
  do {
    const res = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of res.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function deletePrefixObjects(r2Client, bucket, prefix) {
  const keys = await listKeysUnderPrefix(r2Client, bucket, prefix);
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
  return keys.length;
}

async function calculateBucketTotalBytes(r2Client, bucket) {
  let totalBytes = 0;
  let continuationToken;
  do {
    const res = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of res.Contents ?? []) {
      totalBytes += item.Size ?? 0;
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return totalBytes;
}

export async function runPrune({ env = process.env, dryRun = false } = {}) {
  const supabaseConfig = getSupabaseRestConfig(env);
  const rows = await listActiveReleases(supabaseConfig);
  const now = new Date();
  const plan = planPrune(rows, { now });

  if (dryRun) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return plan;
  }

  const r2Client = createR2Client(env);
  const bucket = getR2Bucket(env);

  const nowIso = now.toISOString();
  await markReleasesPruned(supabaseConfig, plan.pruneReleaseIds, nowIso);
  for (const runtime of plan.retireRuntimes) {
    await markRuntimeRetired(supabaseConfig, runtime, nowIso);
  }

  let deletedObjects = 0;
  for (const prefix of plan.deletePrefixes) {
    deletedObjects += await deletePrefixObjects(r2Client, bucket, prefix);
  }

  const totalBytes = await calculateBucketTotalBytes(r2Client, bucket);
  if (totalBytes > BUCKET_ALERT_BYTES) {
    process.stdout.write(
      `::warning::R2 bucket "${bucket}" usage (${totalBytes} bytes) exceeds 1.5 GiB alert threshold (${BUCKET_ALERT_BYTES} bytes)\n`,
    );
  }

  process.stdout.write(
    `OTA prune complete: prunedReleases=${plan.pruneReleaseIds.length}, deletedObjects=${deletedObjects}, retiredRuntimes=${plan.retireRuntimes.length}, bucketBytes=${totalBytes}\n`,
  );

  return plan;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  runPrune({ env: process.env, dryRun }).catch((err) => {
    process.stderr.write(
      `OTA prune failed: ${err instanceof Error ? err.message : 'unknown error'}\n`,
    );
    process.exit(1);
  });
}
