import { Injectable } from '@nestjs/common';
import { UnsupportedDocumentTypeError } from '../domain/document-generation.errors';
import type { DocumentRenderer } from '../domain/ports/document-renderer.port';
import { PayloadDocumentRenderer } from '../infrastructure/strategies/payload.document-renderer';
import { SqlDataDocumentRenderer } from '../infrastructure/strategies/sql-data.document-renderer';

/**
 * Resolves a {@link DocumentRenderer} for a document type. Mirrors the Java
 * `StrategyRegistry`: first matching strategy wins and unknown types fail fast.
 */
@Injectable()
export class DocumentRendererRegistry {
  private readonly renderers: DocumentRenderer[];

  constructor(
    payload: PayloadDocumentRenderer,
    sqlData: SqlDataDocumentRenderer,
  ) {
    this.renderers = [payload, sqlData];
  }

  resolve(documentType: string): DocumentRenderer {
    const renderer = this.renderers.find((r) => r.supports(documentType));
    if (!renderer) {
      throw new UnsupportedDocumentTypeError(documentType);
    }
    return renderer;
  }

  supportedTypes(): string[] {
    return Array.from(
      new Set(this.renderers.flatMap((r) => r.supportedTypes())),
    );
  }
}
