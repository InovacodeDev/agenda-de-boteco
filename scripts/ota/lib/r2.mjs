import { S3Client } from '@aws-sdk/client-s3';

const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9-]+$/;

export function getRequiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getR2Bucket(env) {
  return env.R2_BUCKET?.trim() || 'agenda-ota';
}

export function createR2Client(env = process.env) {
  const accountId = getRequiredEnv(env, 'R2_ACCOUNT_ID');
  if (!ACCOUNT_ID_PATTERN.test(accountId)) {
    throw new Error('Invalid R2_ACCOUNT_ID format');
  }
  const accessKeyId = getRequiredEnv(env, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = getRequiredEnv(env, 'R2_SECRET_ACCESS_KEY');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
