import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../config/env.js';

const UPLOAD_URL_EXPIRES_IN_SECONDS = 60;

const MAGIC_BYTES_LENGTH = 12;

const s3 = new S3Client({
  credentials: {
    accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY,
  },
  endpoint: env.SUPABASE_S3_ENDPOINT,
  forcePathStyle: true,
  region: env.SUPABASE_S3_REGION,
});

const publicPrefix = `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_S3_BUCKET}/`;

export async function deleteObject(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.SUPABASE_S3_BUCKET,
      Key: key,
    }),
  );
}

export async function headObject(key: string) {
  const result = await s3.send(
    new HeadObjectCommand({
      Bucket: env.SUPABASE_S3_BUCKET,
      Key: key,
    }),
  );

  return {
    contentLength: result.ContentLength ?? 0,
  };
}

export function isOwnedAvatarUrl(url: string) {
  return url.startsWith(publicPrefix);
}

export function keyFromPublicUrl(url: string) {
  return url.slice(publicPrefix.length);
}

export async function listUserKeys(userId: string) {
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: env.SUPABASE_S3_BUCKET,
      Prefix: userId,
    }),
  );

  return (result.Contents ?? [])
    .map((object) => object.Key)
    .filter((key): key is string => Boolean(key));
}

export function publicUrlFor(key: string) {
  return `${publicPrefix}${key}`;
}

// Reads only the leading bytes rather than the whole object: pulling the file
// back to the API would give up the one thing the presigned upload bought us.
export async function readMagicBytes(key: string) {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: env.SUPABASE_S3_BUCKET,
      Key: key,
      Range: `bytes=0-${MAGIC_BYTES_LENGTH - 1}`,
    }),
  );

  const bytes = await result.Body?.transformToByteArray();

  return Buffer.from(bytes ?? new Uint8Array());
}

export async function signUpload({
  contentLength,
  contentType,
  key,
}: {
  contentLength: number;
  contentType: string;
  key: string;
}) {
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.SUPABASE_S3_BUCKET,
      ContentLength: contentLength,
      ContentType: contentType,
      Key: key,
    }),
    {
      expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
    },
  );

  return {
    expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
    uploadUrl,
  };
}
