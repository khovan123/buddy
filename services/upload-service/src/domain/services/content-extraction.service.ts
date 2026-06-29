import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export type ContentExtractionStatus = 'AVAILABLE' | 'UNSUPPORTED' | 'FAILED';

export interface ContentExtractionResult {
  status: ContentExtractionStatus;
  text: string | null;
  error?: string | null;
}

const DEFAULT_MAX_CHARS = 20_000;
const TEXT_FILE_EXTENSIONS = new Set([
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
]);

@Injectable()
export class ContentExtractionService {
  constructor(private readonly config: ConfigService) {}
  async extract(
    buffer: Buffer,
    mimeType: string,
    fileName?: string,
  ): Promise<ContentExtractionResult> {
    const normalizedMime = mimeType.toLowerCase();
    const normalizedName = (fileName ?? '').toLowerCase();

    try {
      if (normalizedMime === 'text/plain' || normalizedMime === 'text/markdown') {
        return this.available(this.truncate(buffer.toString('utf-8')));
      }

      if (this.hasTextFileExtension(normalizedName)) {
        return this.available(this.truncate(buffer.toString('utf-8')));
      }

      if (normalizedMime === 'application/pdf' || normalizedName.endsWith('.pdf')) {
        return this.available(this.truncate(await this.extractPdfText(buffer)));
      }

      if (
        normalizedMime ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        normalizedName.endsWith('.docx')
      ) {
        return this.available(this.truncate(await this.extractDocxText(buffer)));
      }

      if (normalizedMime.startsWith('video/')) {
        return {
          status: 'UNSUPPORTED',
          text: null,
          error: 'Video transcript extraction is not configured.',
        };
      }

      return {
        status: 'UNSUPPORTED',
        text: null,
        error: `Unsupported content extraction mime type: ${mimeType}`,
      };
    } catch (error) {
      return {
        status: 'FAILED',
        text: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private available(text: string): ContentExtractionResult {
    return {
      status: text.trim().length > 0 ? 'AVAILABLE' : 'UNSUPPORTED',
      text: text.trim().length > 0 ? text : null,
      error: text.trim().length > 0 ? null : 'No extractable text found.',
    };
  }

  private truncate(text: string): string {
    const maxChars = Number.parseInt(
      this.config.get<string>('CONTENT_EXTRACTION_MAX_CHARS', `${DEFAULT_MAX_CHARS}`),
      10,
    );
    const safeMaxChars = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : DEFAULT_MAX_CHARS;
    return text.length > safeMaxChars ? text.slice(0, safeMaxChars) : text;
  }

  private hasTextFileExtension(fileName: string): boolean {
    return [...TEXT_FILE_EXTENSIONS].some((extension) => fileName.endsWith(extension));
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.replace(/\s+/g, ' ').trim();
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return result.text.replace(/\s+/g, ' ').trim();
  }
}
