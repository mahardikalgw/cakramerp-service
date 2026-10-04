import type { RenderRequest } from '../../domain/document-render.types';

const EXTENSIONS: Record<string, string> = {
  pdf: 'pdf',
  xlsx: 'xlsx',
  csv: 'csv',
};

/** Build a stable, human-readable file name for a generated document. */
export function fileNameFor(
  request: Pick<RenderRequest, 'documentType' | 'entityId'> & {
    outputFormat?: string;
  },
  format = 'pdf',
): string {
  const extension = EXTENSIONS[format] ?? 'pdf';
  const entitySuffix = (request.entityId ?? '').slice(0, 8);
  return `${request.documentType}-${entitySuffix}.${extension}`;
}
