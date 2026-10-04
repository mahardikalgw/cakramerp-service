import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PdfmakeAdapter } from '../pdf/pdfmake.adapter';
import { getTemplate } from '../../templates';
import { getSqlLoader, SQL_LOADERS } from '../../queries';
import { fileNameFor } from '../formatting/file-name';
import { DocumentRenderError } from '../../domain/document-generation.errors';
import type { DocumentRenderer } from '../../domain/ports/document-renderer.port';
import type {
  RenderRequest,
  RenderResult,
} from '../../domain/document-render.types';

/** Document types whose view model is loaded from Postgres by entity id. */
export const SQL_DOCUMENT_TYPES: string[] = Object.keys(SQL_LOADERS);

/**
 * SQL-backed renderer. Equivalent to the Java `SqlDocumentStrategy`: the view
 * model is queried from the shared Postgres database using the owning entity
 * id, mirroring the JRXML `ENTITY_ID` parameter.
 */
@Injectable()
export class SqlDataDocumentRenderer implements DocumentRenderer {
  constructor(
    private readonly pdf: PdfmakeAdapter,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  supports(documentType: string): boolean {
    return SQL_DOCUMENT_TYPES.includes(documentType);
  }

  supportedTypes(): string[] {
    return [...SQL_DOCUMENT_TYPES];
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    try {
      const loader = getSqlLoader(request.documentType);
      if (!loader) {
        throw new Error(
          `No SQL loader registered for document type: ${request.documentType}`,
        );
      }
      const model = await loader(this.dataSource, request.entityId);
      const template = getTemplate(request.documentType);
      const definition = template(model);
      const buffer = await this.pdf.render(definition, request.watermark);
      return {
        buffer,
        contentType: 'application/pdf',
        fileName: fileNameFor(request, 'pdf'),
        size: buffer.length,
      };
    } catch (err: any) {
      throw new DocumentRenderError(
        request.documentType,
        err?.message ?? String(err),
        err,
      );
    }
  }
}
