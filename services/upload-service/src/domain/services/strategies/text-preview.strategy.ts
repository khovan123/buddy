import type { IPreviewProcessor } from '../preview-processor.interface';

/**
 * TextPreviewStrategy — Extracts the first N% of text content.
 *
 * Handles plain text and markdown files by:
 * 1. Cutting the buffer at percentage boundary
 * 2. Ensuring cut happens at a line boundary (not mid-line)
 * 3. Appending a preview watermark at the end
 */
export class TextPreviewStrategy implements IPreviewProcessor {
  private static readonly PREVIEW_WATERMARK =
    '\n\n---\n⚠️ This is a preview. Purchase to view the full document.\n';

  supportedMimeTypes(): string[] {
    return ['text/plain', 'text/markdown', 'text/csv'];
  }

  supportedExtensions(): string[] {
    return [
      '.c',
      '.cc',
      '.cpp',
      '.cs',
      '.csv',
      '.dart',
      '.go',
      '.h',
      '.hpp',
      '.html',
      '.java',
      '.js',
      '.json',
      '.jsx',
      '.kt',
      '.md',
      '.mjs',
      '.php',
      '.py',
      '.rb',
      '.rs',
      '.scss',
      '.sh',
      '.sql',
      '.svelte',
      '.swift',
      '.ts',
      '.tsx',
      '.txt',
      '.vue',
      '.xml',
      '.yaml',
      '.yml',
    ];
  }

  previewMimeType(): string {
    return 'text/plain; charset=utf-8';
  }

  async process(buffer: Buffer, percentage: number): Promise<Buffer> {
    const fullText = buffer.toString('utf-8');

    if (fullText.length === 0) {
      return buffer;
    }

    // If percentage covers the full content, return as-is
    const cutPoint = Math.ceil(fullText.length * percentage);
    if (cutPoint >= fullText.length) {
      return buffer;
    }

    // Find the nearest line break after the cut point to avoid mid-line cuts
    let adjustedCutPoint = cutPoint;
    const nextNewline = fullText.indexOf('\n', cutPoint);
    if (nextNewline !== -1 && nextNewline - cutPoint < 200) {
      adjustedCutPoint = nextNewline + 1;
    }

    const previewText =
      fullText.substring(0, adjustedCutPoint) + TextPreviewStrategy.PREVIEW_WATERMARK;

    return Buffer.from(previewText, 'utf-8');
  }
}
