import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_REGION = "auto";
const PRESIGNED_UPLOAD_TTL_SECONDS = 60;
const PRESIGNED_DOWNLOAD_TTL_SECONDS = 60 * 5;

type RequiredR2EnvKey =
  | "R2_ENDPOINT"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_BUCKET_NAME";

let cachedClient: S3Client | null = null;

function getRequiredEnv(key: RequiredR2EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: R2_REGION,
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return cachedClient;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\s+/g, "-");
  const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, "");
  return sanitized.slice(0, 120) || "file";
}

function escapeForContentDisposition(fileName: string) {
  return fileName.replace(/"/g, "");
}

export function buildR2ObjectKey(params: {
  organizationId: string;
  chatId: string;
  fileName: string;
}) {
  const { organizationId, chatId, fileName } = params;
  const safeName = sanitizeFileName(fileName);
  return `${organizationId}/${chatId}/${Date.now()}-${randomUUID()}-${safeName}`;
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getRequiredEnv("R2_BUCKET_NAME"),
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
  });

  return {
    uploadUrl,
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
  };
}

export async function createPresignedDownloadUrl(params: {
  key: string;
  fileName: string;
}) {
  const command = new GetObjectCommand({
    Bucket: getRequiredEnv("R2_BUCKET_NAME"),
    Key: params.key,
    ResponseContentDisposition: `attachment; filename="${escapeForContentDisposition(
      sanitizeFileName(params.fileName)
    )}"`,
  });

  const url = await getSignedUrl(getClient(), command, {
    expiresIn: PRESIGNED_DOWNLOAD_TTL_SECONDS,
  });

  return {
    url,
    expiresIn: PRESIGNED_DOWNLOAD_TTL_SECONDS,
  };
}

export function parseObjectKey(key: string) {
  const parts = key.split("/");
  return {
    organizationId: parts[0] || "",
    chatId: parts[1] || "",
  };
}
