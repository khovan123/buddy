import { Injectable } from '@nestjs/common';

import { AppLogger } from '@libs/common';

import type { IPreviewProcessor } from './preview-processor.interface';
import { OfficePreviewStrategy } from './strategies/office-preview.strategy';
import { PdfPreviewStrategy } from './strategies/pdf-preview.strategy';
import { TextPreviewStrategy } from './strategies/text-preview.strategy';

const FALLBACK_PREVIEW_MIME_TYPE = 'text/plain; charset=utf-8';

/**
 * PreviewProcessorContext — Registry that auto-selects the correct
 * preview strategy based on MIME type.
 *
 * Strategies are registered at construction time. When `generatePreview`
 * is called, the context finds the first strategy whose `supportedMimeTypes()`
 * includes the given MIME type and delegates processing to it.
 */
@Injectable()
export class PreviewProcessorContext {
  private readonly logger = new AppLogger(PreviewProcessorContext.name);
  private readonly strategies: IPreviewProcessor[];

  constructor() {
    this.strategies = [
      new PdfPreviewStrategy(),
      new TextPreviewStrategy(),
      new OfficePreviewStrategy(),
    ];

    const allMimeTypes = this.strategies.flatMap((s) => s.supportedMimeTypes());
    this.logger.log(`Registered preview strategies for: ${allMimeTypes.join(', ')}`);
  }

  /**
   * Find a processor that supports the given MIME type.
   * Returns null if no strategy matches.
   */
  getProcessor(mimeType: string, fileName?: string | null): IPreviewProcessor | null {
    const normalizedMime = mimeType.toLowerCase();
    const extension = this.resolveExtension(fileName);

    return (
      this.strategies.find(
        (s) =>
          s.supportedMimeTypes().includes(normalizedMime) ||
          Boolean(extension && s.supportedExtensions?.().includes(extension)),
      ) ?? null
    );
  }

  /**
   * Check if any file can produce a preview artifact.
   * Specific strategies generate partial previews; unsupported formats get
   * a text placeholder preview so every upload can have a preview file.
   */
  isSupported(_mimeType: string, _fileName?: string | null): boolean {
    return true;
  }

  /**
   * Resolve the MIME type that should be attached to the generated preview object.
   */
  getPreviewMimeType(mimeType: string, fileName?: string | null): string {
    const processor = this.getProcessor(mimeType, fileName);

    if (!processor) {
      return FALLBACK_PREVIEW_MIME_TYPE;
    }

    return processor.previewMimeType?.(mimeType) ?? mimeType;
  }

  /**
   * Generate a preview buffer from the original file.
   *
   * @param buffer - Original file content
   * @param mimeType - MIME type of the file
   * @param percentage - Fraction of content to include (default 0.3 = 30%)
   * @throws UnsupportedFormatError if no strategy matches the MIME type
   */
  async generatePreview(buffer: Buffer, mimeType: string, percentage = 0.3): Promise<Buffer> {
    const processor = this.getProcessor(mimeType);

    if (!processor) {
      return this.buildFallbackPreview(mimeType);
    }

    this.logger.debug(
      `Processing preview: mimeType=${mimeType}, percentage=${percentage}, inputSize=${buffer.length}`,
    );

    const result = await processor.process(buffer, percentage);

    this.logger.debug(
      `Preview generated: outputSize=${result.length} (${Math.round((result.length / buffer.length) * 100)}% of original)`,
    );

    return result;
  }

  async generatePreviewForFile(
    buffer: Buffer,
    mimeType: string,
    fileName?: string | null,
    percentage = 0.3,
  ): Promise<Buffer> {
    const processor = this.getProcessor(mimeType, fileName);

    if (!processor) {
      return this.buildFallbackPreview(mimeType, fileName);
    }

    this.logger.debug(
      `Processing preview: mimeType=${mimeType}, fileName=${fileName ?? 'unknown'}, percentage=${percentage}, inputSize=${buffer.length}`,
    );

    const result = await processor.process(buffer, percentage);

    this.logger.debug(
      `Preview generated: outputSize=${result.length} (${Math.round((result.length / buffer.length) * 100)}% of original)`,
    );

    return result;
  }

  private buildFallbackPreview(mimeType: string, fileName?: string | null): Buffer {
    const displayName = fileName?.trim() || 'Uploaded file';
    const content = [
      '# File Preview',
      '',
      `File: ${displayName}`,
      `Type: ${mimeType || 'application/octet-stream'}`,
      '',
      'A generated inline preview is not available for this file format.',
      'The full file is available after purchase.',
    ].join('\n');

    return Buffer.from(content, 'utf-8');
  }

  private resolveExtension(fileName?: string | null): string | null {
    if (!fileName) {
      return null;
    }

    const normalized = fileName.trim().toLowerCase();
    const dotIndex = normalized.lastIndexOf('.');
    return dotIndex >= 0 ? normalized.slice(dotIndex) : null;
  }
}
