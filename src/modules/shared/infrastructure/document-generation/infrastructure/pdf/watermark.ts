import type { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Apply a diagonal watermark (e.g. `DRAFT`) to every page. Draft lab reports
 * carry a visible marking; final reports do not (FR-005).
 */
export function applyWatermark(
  definition: TDocumentDefinitions,
  text: string,
): TDocumentDefinitions {
  return {
    ...definition,
    watermark: {
      text,
      color: '#DC3232',
      opacity: 0.15,
      bold: true,
      italics: false,
    },
  } as TDocumentDefinitions;
}
