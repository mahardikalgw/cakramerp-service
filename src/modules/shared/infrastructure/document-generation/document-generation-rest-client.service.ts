import { Injectable, Logger } from '@nestjs/common';
import { envConfig } from '../../../../config/env.config';

interface SyncDocumentRequest {
  documentType: string;
  entityId?: string;
  outputFormat?: string;
  watermark?: string;
  parameters?: Record<string, any>;
  lines?: Record<string, any>[];
}

interface SyncDocumentResponse {
  status: string;
  minioPath?: string;
  minioBucket?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  errorMessage?: string;
  completedAt?: string;
}

@Injectable()
export class DocumentGenerationRestClient {
  private readonly logger = new Logger(DocumentGenerationRestClient.name);
  private readonly serviceUrl: string;

  constructor() {
    this.serviceUrl =
      envConfig.documentService?.url || 'http://localhost:8080';
  }

  async generateSync(
    request: SyncDocumentRequest,
  ): Promise<SyncDocumentResponse> {
    const url = `${this.serviceUrl}/api/documents/generate-sync`;

    this.logger.log(
      `Calling document service sync: POST ${url} for ${request.documentType}`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    let body: SyncDocumentResponse;
    try {
      body = (await response.json()) as SyncDocumentResponse;
    } catch {
      // Handle empty or non-JSON response body
      if (!response.ok) {
        throw new Error(
          `Document service returned HTTP ${response.status}`,
        );
      }
      body = { status: 'failed', errorMessage: 'Empty response from document service' };
    }

    if (!response.ok || body.status === 'failed') {
      this.logger.error(
        `Document generation failed: ${body.errorMessage || 'Unknown error'}`,
      );
      throw new Error(
        `Document generation failed: ${body.errorMessage || 'HTTP ' + response.status}`,
      );
    }

    this.logger.log(
      `Document generation completed: ${body.minioPath}`,
    );
    return body;
  }
}
