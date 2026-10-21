import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import type { Readable } from 'stream';
import { envConfig } from '../../../../config/env.config';

/**
 * Why a storage operation failed, in the categories operators need to tell
 * apart (FR-010): the store is unreachable, the object is missing, or the
 * credentials were rejected. The S3 client library already reports these as
 * distinct error codes, so this only names them.
 */
export type StorageFailureKind =
  'unreachable' | 'not-found' | 'access-denied' | 'unknown';

/** S3/SDK error codes per failure category (verified against RustFS). */
const NOT_FOUND_CODES = new Set(['NoSuchKey', 'NoSuchBucket', 'NotFound']);
const ACCESS_DENIED_CODES = new Set([
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'AccessDenied',
  'InvalidBucketName',
]);
const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
  'RequestTimeTooSkewed',
]);

/**
 * Classify a storage error so the three operational failure modes are
 * distinguishable in logs and health reporting.
 */
export function classifyStorageError(err: any): StorageFailureKind {
  const code = err?.code ?? err?.name ?? '';
  if (NOT_FOUND_CODES.has(code)) return 'not-found';
  if (ACCESS_DENIED_CODES.has(code)) return 'access-denied';
  if (UNREACHABLE_CODES.has(code)) return 'unreachable';
  // Node surfaces connection problems as bare system errors too.
  const message = String(err?.message ?? '');
  if (
    /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|timed? ?out/i.test(message)
  ) {
    return 'unreachable';
  }
  return 'unknown';
}

/** Human-readable cause, so a log line alone identifies the problem. */
function describeFailure(kind: StorageFailureKind): string {
  switch (kind) {
    case 'unreachable':
      return 'object store unreachable — check the endpoint, port, and that the store is running';
    case 'access-denied':
      return 'object store rejected the credentials — check the access/secret key';
    case 'not-found':
      return 'object or bucket does not exist';
    default:
      return 'unclassified object store failure';
  }
}

@Injectable()
export class MinioClientService implements OnModuleInit {
  private readonly logger = new Logger(MinioClientService.name);
  private readonly minioClient: Client;

  constructor() {
    const cfg = envConfig.minio;
    this.minioClient = new Client({
      endPoint: cfg?.endpoint || 'localhost',
      port: cfg?.port || 9000,
      useSSL: false,
      accessKey: cfg?.accessKey || 'minioadmin',
      secretKey: cfg?.secretKey || 'minioadmin',
    });
  }

  async onModuleInit() {
    const cfg = envConfig.minio;

    // Fail fast and visibly: a misconfigured or unreachable store must stop
    // start-up rather than surface later at a user's first upload (FR-011).
    try {
      await this.ensureBucket(cfg?.bucket || 'documents');
    } catch (err: any) {
      const kind = classifyStorageError(err);
      this.logger.error(
        `Object storage is not usable (${kind}): ${describeFailure(kind)} — endpoint=${cfg?.endpoint ?? 'unset'}:${cfg?.port ?? 'unset'}, bucket=${cfg?.bucket ?? 'unset'}`,
      );
      throw err;
    }

    this.logger.log(
      `Object storage client initialized (endpoint=${cfg?.endpoint}:${cfg?.port}, bucket=${cfg?.bucket || 'documents'})`,
    );
  }

  /** Log and rethrow, so the failure category is always visible to callers. */
  private async withContext<T>(
    operation: string,
    bucket: string,
    objectName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const kind = classifyStorageError(err);
      this.logger.error(
        `Object storage ${operation} failed (${kind}): ${describeFailure(kind)} — ${bucket}/${objectName}`,
      );
      throw err;
    }
  }

  async uploadFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.withContext('upload', bucket, objectName, () =>
      this.minioClient.putObject(bucket, objectName, buffer, buffer.length, {
        'Content-Type': contentType,
      }),
    );
    return `${bucket}/${objectName}`;
  }

  async getPresignedUrl(
    bucket: string,
    objectName: string,
    expiry = 3600,
  ): Promise<string> {
    return this.minioClient.presignedGetObject(bucket, objectName, expiry);
  }

  /**
   * Build a public backend URL that proxies the requested object.
   * This keeps the object store's endpoint (often localhost:9000) off the
   * client — the store is never exposed directly (FR-009).
   */
  getPublicDownloadUrl(bucket: string, objectName: string): string {
    const baseUrl = (envConfig.apiUrl || '').replace(/\/$/, '');
    return `${baseUrl}/documents/download?bucket=${encodeURIComponent(bucket)}&object=${encodeURIComponent(objectName)}`;
  }

  async getObjectStream(bucket: string, objectName: string): Promise<Readable> {
    return this.withContext('read', bucket, objectName, () =>
      this.minioClient.getObject(bucket, objectName),
    );
  }

  async deleteFile(bucket: string, objectName: string): Promise<void> {
    await this.withContext('delete', bucket, objectName, () =>
      this.minioClient.removeObject(bucket, objectName),
    );
  }

  /**
   * Idempotent: creates the bucket only when it is absent (FR-007). Re-running
   * against a store where the bucket already exists succeeds unchanged.
   */
  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket);
      this.logger.log(`Created object storage bucket: ${bucket}`);
    }
  }
}
