/**
 * IPreviewProcessor — Strategy Pattern interface for document preview generation.
 *
 * Each concrete strategy handles a specific set of MIME types and knows how to
 * extract a percentage-based preview from the original file buffer.
 */
export interface IPreviewProcessor {
  /**
   * Returns the list of MIME types this strategy can handle.
   * Example: ['application/pdf']
   */
  supportedMimeTypes(): string[];

  /**
   * MIME type of the generated preview object.
   * Defaults to the original MIME type when a strategy omits this hook.
   */
  previewMimeType?(sourceMimeType: string): string;

  /**
   * Process the original file buffer and return a preview buffer.
   *
   * @param buffer - The original file content
   * @param percentage - Fraction of content to include (0.0 - 1.0, e.g. 0.3 = 30%)
   * @returns Preview buffer ready to be uploaded to S3
   */
  process(buffer: Buffer, percentage: number): Promise<Buffer>;
}

/**
 * Error thrown when no strategy supports the given MIME type.
 */
export class UnsupportedFormatError extends Error {
  constructor(mimeType: string) {
    super(`No preview processor supports MIME type: ${mimeType}`);
    this.name = 'UnsupportedFormatError';
  }
}
