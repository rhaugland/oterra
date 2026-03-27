import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION ?? "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
    },
    forcePathStyle: !!process.env.STORAGE_ENDPOINT, // needed for non-AWS endpoints (e.g. MinIO)
  });
}

const BUCKET = () => process.env.STORAGE_BUCKET ?? "";

export async function getUploadUrl(
  key: string,
  contentType: string,
  maxSize: number
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: contentType,
    ContentLength: maxSize,
  });

  return getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes
}

export async function getDownloadUrl(
  key: string,
  expiresIn = 300 // 5 minutes default
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET(),
      Key: key,
    })
  );
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getS3Client();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET(),
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}
