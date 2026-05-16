import { S3ClientConfig } from '@aws-sdk/client-s3';

export function getS3Config(): S3ClientConfig {
  const endpoint = process.env.S3_URL;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw Error('Need s3 config');
  }

  return {
    forcePathStyle: true,
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
}
