import { AppLogger } from '@libs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ContentExtractionResult } from './content-extraction.service';

interface TranscriptProviderResponse {
  transcript?: string;
  text?: string;
  error?: string;
}

const DEFAULT_MAX_CHARS = 20_000;

@Injectable()
export class VideoTranscriptService {
  private readonly logger = new AppLogger(VideoTranscriptService.name);

  constructor(private readonly config: ConfigService) {}

  async transcribe(params: {
    fileId: string;
    s3Key: string;
    signedUrl: string;
    originalFilename: string;
    mimeType: string;
    uploadedBy: string;
  }): Promise<ContentExtractionResult> {
    const endpoint = this.config.get<string>('VIDEO_TRANSCRIPT_PROVIDER_URL');
    if (!endpoint) {
      return {
        status: 'UNSUPPORTED',
        text: null,
        error: 'VIDEO_TRANSCRIPT_PROVIDER_URL is not configured.',
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          fileId: params.fileId,
          s3Key: params.s3Key,
          fileUrl: params.signedUrl,
          originalFilename: params.originalFilename,
          mimeType: params.mimeType,
          uploadedBy: params.uploadedBy,
        }),
      });

      if (!response.ok) {
        return {
          status: 'FAILED',
          text: null,
          error: `Transcript provider returned HTTP ${response.status}.`,
        };
      }

      const data = (await response.json()) as TranscriptProviderResponse;
      const transcript = data.transcript ?? data.text ?? '';
      if (!transcript.trim()) {
        return {
          status: 'FAILED',
          text: null,
          error: data.error ?? 'Transcript provider returned empty transcript.',
        };
      }

      return {
        status: 'AVAILABLE',
        text: this.truncate(transcript),
        error: null,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Transcript provider request failed for ${params.fileId}: ${reason}`);
      return {
        status: 'FAILED',
        text: null,
        error: reason,
      };
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = this.config.get<string>('VIDEO_TRANSCRIPT_PROVIDER_API_KEY');
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }

  private truncate(text: string): string {
    const maxChars = Number.parseInt(
      this.config.get<string>('CONTENT_EXTRACTION_MAX_CHARS', `${DEFAULT_MAX_CHARS}`),
      10,
    );
    const safeMaxChars = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : DEFAULT_MAX_CHARS;
    return text.length > safeMaxChars ? text.slice(0, safeMaxChars) : text;
  }
}
