import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import { envConfig } from '../../../../config/env.config';

@Injectable()
export class MinioClientService implements OnModuleInit {
  private readonly logger = new Logger(MinioClientService.name);
  private minioClient: Client;

  async onModuleInit() {
    const cfg = envConfig.minio;
    this.minioClient = new Client({
      endPoint: cfg?.endpoint || 'localhost',
      port: cfg?.port || 9000,
      useSSL: false,
      accessKey: cfg?.accessKey || 'minioadmin',
      secretKey: cfg?.secretKey || 'minioadmin',
    });
    await this.ensureBucket(cfg?.bucket || 'documents');
    this.logger.log('MinIO client initialized');
  }

  async uploadFile(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.minioClient.putObject(
      bucket,
      objectName,
      buffer,
      buffer.length,
      { 'Content-Type': contentType },
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

  async deleteFile(bucket: string, objectName: string): Promise<void> {
    await this.minioClient.removeObject(bucket, objectName);
  }

  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket);
      this.logger.log(`Created MinIO bucket: ${bucket}`);
    }
  }
}
