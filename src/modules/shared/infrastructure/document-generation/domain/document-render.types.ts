import type { OutputFormat } from '../document-generation.constants';

/**
 * Normalized input accepted by every {@link DocumentRenderer}.
 * Payload-driven types populate `parameters`/`lines`; SQL-backed types only
 * need `entityId` (the loader reads the rest from Postgres).
 */
export interface RenderRequest {
  documentType: string;
  entityId: string;
  outputFormat?: OutputFormat | string;
  parameters?: Record<string, any>;
  lines?: Record<string, any>[];
  /** Optional watermark text rendered on every page (e.g. `DRAFT`). */
  watermark?: string;
}

/** Result of a successful render, ready to upload to object storage. */
export interface RenderResult {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  size: number;
}

/**
 * View model handed to a template builder. Both renderer families produce this
 * shape so templates are agnostic to where the data came from.
 */
export interface RenderViewModel {
  parameters: Record<string, any>;
  lines: Record<string, any>[];
}
