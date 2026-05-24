import { AppLogger } from '@libs/common';
import { ContentExtractedEvent } from '@libs/contracts';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { ContentExtractionService } from '../../domain/services/content-extraction.service';
import { VideoTranscriptService } from '../../domain/services/video-transcript.service';
import { OutboxService } from '../messaging/publishers/outbox.service';
import { S3Service } from '../persistence/aws/s3.service';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface ContentExtractionJobData {
  contentId: string;
  contentType: 'RESOURCE' | 'TUTORIAL';
  fileIds: string[];
  uploadedBy: string;
  correlationId?: string;
}

export const CONTENT_EXTRACTION_QUEUE = 'upload.content.extraction';

@Processor(CONTENT_EXTRACTION_QUEUE)
export class ContentExtractionWorker extends WorkerHost {
  private readonly logger = new AppLogger(ContentExtractionWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly s3Service: S3Service,
    private readonly contentExtraction: ContentExtractionService,
    private readonly videoTranscript: VideoTranscriptService,
  ) {
    super();
  }

  async process(job: Job<ContentExtractionJobData>): Promise<void> {
    const { contentId, contentType, fileIds, uploadedBy, correlationId } = job.data;
    const files = await this.prisma.client.mediaFile.findMany({
      where: { id: { in: fileIds }, deletedAt: null },
      select: {
        id: true,
        s3Key: true,
        originalFilename: true,
        mimeType: true,
        downloadUrl: true,
      },
    });

    const extractedFiles = await Promise.all(
      files.map(async (file) => {
        const extraction = file.mimeType.startsWith('video/')
          ? await this.videoTranscript.transcribe({
              fileId: file.id,
              s3Key: file.s3Key,
              signedUrl: await this.s3Service.generatePresignedDownloadUrl(file.s3Key),
              originalFilename: file.originalFilename,
              mimeType: file.mimeType,
              uploadedBy,
            })
          : await this.contentExtraction.extract(
              await this.s3Service.getObjectBuffer(file.s3Key),
              file.mimeType,
              file.originalFilename,
            );

        return {
          fileId: file.id,
          s3Key: file.s3Key,
          downloadUrl: file.downloadUrl,
          mimeType: file.mimeType,
          originalFilename: file.originalFilename,
          extractedText: extraction.text,
          extractionStatus: extraction.status,
          extractionError: extraction.error ?? null,
        };
      }),
    );

    await this.prisma.client.$transaction(async (tx) => {
      await this.outboxService.put(
        new ContentExtractedEvent(
          {
            contentId,
            contentType,
            files: extractedFiles,
            extractedAt: new Date().toISOString(),
          },
          correlationId ?? contentId,
        ),
        tx,
      );
    });

    this.outboxService.notifyFlush();
    this.logger.log(
      `Published ${contentType} content extraction for ${contentId} (${extractedFiles.length} files)`,
    );
  }
}
