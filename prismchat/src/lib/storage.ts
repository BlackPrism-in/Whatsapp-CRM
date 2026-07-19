import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET ?? "";

export const s3 = new S3Client({
  region,
  endpoint: process.env.S3_ENDPOINT || undefined, // for S3-compatible (R2/MinIO)
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/** Presigned URL for a browser to upload directly to S3. */
export function presignUpload(key: string, contentType: string, expiresIn = 300) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

/** Presigned URL to read a private object. */
export function presignDownload(key: string, expiresIn = 300) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn,
  });
}

export const storageBucket = bucket;
