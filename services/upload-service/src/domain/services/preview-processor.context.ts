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
  getProcessor(mimeType: string): IPreviewProcessor | null {
    return this.strategies.find((s) => s.supportedMimeTypes().includes(mimeType)) ?? null;
  }

  /**
   * Check if any strategy supports the given MIME type.
   */
  isSupported(mimeType: string): boolean {
    return this.getProcessor(mimeType) !== null;
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
}
