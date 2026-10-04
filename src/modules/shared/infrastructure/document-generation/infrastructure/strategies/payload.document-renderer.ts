import { Injectable } from '@nestjs/common';
import { PdfmakeAdapter } from '../pdf/pdfmake.adapter';
import { getTemplate } from '../../templates';
import { fileNameFor } from '../formatting/file-name';
import { DOCUMENT_TYPES } from '../../document-generation.constants';
import { DocumentRenderError } from '../../domain/document-generation.errors';
import type { DocumentRenderer } from '../../domain/ports/document-renderer.port';
import type {
  RenderRequest,
  RenderResult,
} from '../../domain/document-render.types';

/** Document types whose view model is supplied entirely by the request payload. */
export const PAYLOAD_DOCUMENT_TYPES: string[] = [
  DOCUMENT_TYPES.LAB_PURCHASE_ORDER,
  DOCUMENT_TYPES.LAB_INVOICE,
  DOCUMENT_TYPES.LAB_TAX_INVOICE,
  DOCUMENT_TYPES.TAX_INVOICE,
  DOCUMENT_TYPES.LAB_CONTRACT,
  DOCUMENT_TYPES.LAB_POST_APPROVAL_CONTRACT,
  DOCUMENT_TYPES.CONTRACT_MONTHLY_INVOICE,
  DOCUMENT_TYPES.TEST_RESULT_CERTIFICATE,
  DOCUMENT_TYPES.TESTING_RESULT_CERTIFICATE,
  DOCUMENT_TYPES.TESTING_RESULT_CERTIFICATE_POST,
];

/**
 * Data-driven renderer. Equivalent to the Java `DataDrivenDocumentStrategy`:
 * the view model comes from `parameters` + `lines` sent by the caller.
 */
@Injectable()
export class PayloadDocumentRenderer implements DocumentRenderer {
  constructor(private readonly pdf: PdfmakeAdapter) {}

  supports(documentType: string): boolean {
    return PAYLOAD_DOCUMENT_TYPES.includes(documentType);
  }

  supportedTypes(): string[] {
    return [...PAYLOAD_DOCUMENT_TYPES];
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    try {
      const template = getTemplate(request.documentType);
      const definition = template({
        parameters: request.parameters ?? {},
        lines: request.lines ?? [],
      });
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
