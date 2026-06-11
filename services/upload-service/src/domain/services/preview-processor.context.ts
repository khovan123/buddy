import { Injectable } from '@nestjs/common';

import { AppLogger } from '@libs/common';

import type { IPreviewProcessor } from './preview-processor.interface';
import { UnsupportedFormatError } from './preview-processor.interface';
import { OfficePreviewStrategy } from './strategies/office-preview.strategy';
import { PdfPreviewStrategy } from './strategies/pdf-preview.strategy';
import { TextPreviewStrategy } from './strategies/text-preview.strategy';

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
   * Check if any strategy supports the given MIME type.
   */
  isSupported(mimeType: string, fileName?: string | null): boolean {
    return this.getProcessor(mimeType, fileName) !== null;
  }

  /**
   * Resolve the MIME type that should be attached to the generated preview object.
   */
  getPreviewMimeType(mimeType: string, fileName?: string | null): string {
    const processor = this.getProcessor(mimeType, fileName);

    if (!processor) {
      throw new UnsupportedFormatError(mimeType);
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
      throw new UnsupportedFormatError(mimeType);
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
      throw new UnsupportedFormatError(mimeType);
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

  private resolveExtension(fileName?: string | null): string | null {
    if (!fileName) {
      return null;
    }

    const normalized = fileName.trim().toLowerCase();
    const dotIndex = normalized.lastIndexOf('.');
    return dotIndex >= 0 ? normalized.slice(dotIndex) : null;
  }
}
