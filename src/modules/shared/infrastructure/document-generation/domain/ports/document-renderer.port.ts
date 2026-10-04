import type { RenderRequest, RenderResult } from '../document-render.types';

/**
 * A renderer strategy. Mirrors the Java `DocumentGenerationStrategy` split:
 * payload-driven vs SQL-backed.
 */
export interface DocumentRenderer {
  /** Whether this renderer can produce the given document type. */
  supports(documentType: string): boolean;
  /** All document types this renderer claims (diagnostics / registry). */
  supportedTypes(): string[];
  /** Render the document to bytes. */
  render(request: RenderRequest): Promise<RenderResult>;
}
