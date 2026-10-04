/** Raised when no renderer claims a requested `documentType`. */
export class UnsupportedDocumentTypeError extends Error {
  constructor(public readonly documentType: string) {
    super(`Unsupported document type: ${documentType}`);
    this.name = 'UnsupportedDocumentTypeError';
  }
}

/** Raised when a renderer fails to produce a document. */
export class DocumentRenderError extends Error {
  constructor(
    public readonly documentType: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`Failed to render ${documentType}: ${message}`);
    this.name = 'DocumentRenderError';
  }
}
