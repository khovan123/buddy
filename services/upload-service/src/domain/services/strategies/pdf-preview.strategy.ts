import { PDFDocument } from 'pdf-lib';

import type { IPreviewProcessor } from '../preview-processor.interface';

/**
 * PdfPreviewStrategy — Extracts the first N% of pages from a PDF document.
 *
 * Uses pdf-lib to:
 * 1. Load the original PDF
 * 2. Calculate how many pages = ceil(totalPages * percentage)
 * 3. Copy those pages into a new PDF
 * 4. Return the new PDF as Buffer
 */
export class PdfPreviewStrategy implements IPreviewProcessor {
  supportedMimeTypes(): string[] {
    return ['application/pdf'];
  }

  previewMimeType(): string {
    return 'application/pdf';
  }

  async process(buffer: Buffer, percentage: number): Promise<Buffer> {
    const originalPdf = await PDFDocument.load(buffer);
    const totalPages = originalPdf.getPageCount();

    if (totalPages === 0) {
      return buffer;
    }

    // At minimum 1 page, at most all pages
    const previewPageCount = Math.max(1, Math.ceil(totalPages * percentage));

    // If preview would include all pages, return original
    if (previewPageCount >= totalPages) {
      return buffer;
    }

    const previewPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: previewPageCount }, (_, i) => i);
    const copiedPages = await previewPdf.copyPages(originalPdf, pageIndices);

    for (const page of copiedPages) {
      previewPdf.addPage(page);
    }

    // Set metadata to indicate this is a preview
    previewPdf.setTitle(`Preview (${Math.round(percentage * 100)}%)`);
    previewPdf.setProducer('Buddy Preview System');

    const previewBytes = await previewPdf.save();
    return Buffer.from(previewBytes);
  }
}
