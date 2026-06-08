import type { IPreviewProcessor } from '../preview-processor.interface';

/**
 * OfficePreviewStrategy — Placeholder for .docx and .pptx files.
 *
 * Phase 1: Returns a plain text placeholder indicating the format is not
 *          fully supported for preview yet.
 * Phase 2 (Future): Will use pptx-to-pdf conversion for full support.
 */
export class OfficePreviewStrategy implements IPreviewProcessor {
  supportedMimeTypes(): string[] {
    return [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/msword', // .doc
      'application/vnd.ms-powerpoint', // .ppt
    ];
  }

  previewMimeType(): string {
    return 'text/plain; charset=utf-8';
  }

  async process(_buffer: Buffer, _percentage: number): Promise<Buffer> {
    const placeholderText = [
      '# Document Preview',
      '',
      'Preview is not yet available for this document format.',
      '',
      'This file will be available in full once you purchase access.',
      '',
      '---',
      '⚠️ Office document preview support (docx/pptx) is coming soon.',
    ].join('\n');

    return Buffer.from(placeholderText, 'utf-8');
  }
}
