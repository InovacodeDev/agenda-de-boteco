import { PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';

import { buildLifecycleRules } from './lib/lifecycle.mjs';
import { createR2Client, getR2Bucket } from './lib/r2.mjs';

const APP_SLUGS = ['agenda-de-boteco', 'agenda-de-boteco-client'];
const EXPIRATION_DAYS = 30;

async function main() {
  const client = createR2Client(process.env);
  const bucket = getR2Bucket(process.env);
  const rules = buildLifecycleRules(APP_SLUGS, EXPIRATION_DAYS);

  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: rules,
      },
    }),
  );

  process.stdout.write(
    `Applied R2 lifecycle rules on bucket "${bucket}": ${rules.map((r) => r.ID).join(', ')}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `Failed to apply R2 lifecycle configuration: ${err instanceof Error ? err.message : 'unknown error'}\n`,
  );
  process.exit(1);
});
