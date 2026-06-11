import type {
  DocumentType,
  OutputFormat,
} from '../document-generation.constants';

export interface DocumentGenerationRequest {
  requestId: string;
  documentType: DocumentType;
  entityId: string;
  entityIds?: string[];
  tenantId: string;
  requestedBy: string;
  outputFormat: OutputFormat;
  parameters?: Record<string, any>;
  callbackUrl?: string;
  /** Optional watermark text to overlay on every page (e.g. 'DRAFT', 'COPY'). */
  watermark?: string;
}

export interface DocumentGenerationResult {
  requestId: string;
  documentType: string;
  entityId: string;
  status: 'completed' | 'failed';
  minioPath?: string;
  minioBucket?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  errorMessage?: string;
  completedAt: string;
}
