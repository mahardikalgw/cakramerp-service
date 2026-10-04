import { Injectable, Logger } from '@nestjs/common';
import type { Readable } from 'stream';
import { envConfig } from '../../../../../../config/env.config';
import { MinioClientService } from '../../minio-client.service';

export interface StoredObject {
  bucket: string;
  objectName: string;
}

/** Uploads/deletes generated document objects in the shared MinIO bucket. */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);

  constructor(private readonly minio: MinioClientService) {}

  private get bucket(): string {
    return envConfig.minio?.bucket || 'documents';
  }

  private sanitize(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async upload(
    buffer: Buffer,
    contentType: string,
    fileName: string,
    folder: string,
  ): Promise<StoredObject> {
    const objectName = `${folder}/${Date.now()}-${this.sanitize(fileName)}`;
    await this.minio.uploadFile(this.bucket, objectName, buffer, contentType);
    return { bucket: this.bucket, objectName };
  }

  async delete(bucket: string, objectName: string): Promise<void> {
    try {
      await this.minio.deleteFile(bucket, objectName);
    } catch (err: any) {
      this.logger.warn(
        `Failed to delete object ${bucket}/${objectName}: ${err?.message ?? err}`,
      );
    }
  }

  getStream(bucket: string, objectName: string): Promise<Readable> {
    return this.minio.getObjectStream(bucket, objectName);
  }
}
