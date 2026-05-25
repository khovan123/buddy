import { AppLogger, QUEUES } from '@libs/common';
import {
  FileProcessedEvent,
  FileProcessingFailedEvent,
  UPLOAD_ROUTINGKEYS,
  VideoProcessingJobEvent,
} from '@libs/contracts';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { Job, Queue } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import { randomUUID } from 'crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

// Point fluent-ffmpeg to the bundled binaries from npm
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

import { OutboxService } from '../messaging/publishers/outbox.service';
import { S3Service } from '../persistence/aws/s3.service';
import { CloudinaryService } from '../persistence/cloudinary/cloudinary.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { type ContentExtractionJobData } from './content-extraction.worker';

/** Represents the  video processor worker component. */
@Processor(QUEUES.VIDEO_PROCESSING_QUEUE)
export class VideoProcessorWorker extends WorkerHost {
  private readonly logger = new AppLogger(VideoProcessorWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly supabaseStorage: S3Service,
    private readonly cloudinaryStorage: CloudinaryService,
    @InjectQueue(QUEUES.CONTENT_EXTRACTION_QUEUE)
    private readonly extractionQueue: Queue<ContentExtractionJobData>,
  ) {
    super();
  }

  /**
   * Executes the process operation.
   *
   * @param job - The job parameter
   */
  async process(job: Job<VideoProcessingJobEvent['payload']>): Promise<void> {
    if (job.name !== UPLOAD_ROUTINGKEYS.VIDEO_PROCESSING_JOB) {
      this.logger.warn(`Skipping unknown job ${job.name}`);
      return;
    }

    // 1. Lấy dữ liệu từ Job theo chuẩn mới (s3Key thay vì temporaryPath)
    const { fileId, s3Key, uploadedBy } = job.data;

    // 2. Tạo thư mục tạm thời trên ổ cứng của Worker
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), `upload-${fileId}-`));
    const localOriginalPath = path.join(tmpRoot, 'original.mp4');
    const hlsDir = path.join(tmpRoot, 'hls');
    const trailerFile = path.join(tmpRoot, 'trailer.mp4');

    // Hoisted so the post-processing steps (flush + extraction enqueue)
    // can access it after the main try/catch/finally completes.
    let processedEvent: FileProcessedEvent | undefined;

    // Deterministic correlationId so BullMQ retries produce the same
    // correlation trace instead of a new UUID each attempt.
    const correlationId = fileId;

    try {
      await mkdir(hlsDir, { recursive: true });

      // 3. 🚀 TẢI FILE TỪ S3 VỀ WORKER
      this.logger.log(`Downloading file ${s3Key} from S3...`);
      // Lưu ý: Bạn cần viết thêm hàm downloadFile trong S3Service của bạn!
      await this.supabaseStorage.downloadFile(s3Key, localOriginalPath);

      // Lấy dung lượng file thật để bắn Event
      const fileStats = await stat(localOriginalPath);
      const fileSizeBytes = fileStats.size;

      // 4. CHẠY FFMPEG
      this.logger.log(`Generating HLS for ${fileId}...`);
      await this.generateHls(localOriginalPath, hlsDir);

      this.logger.log(`Extracting trailer for ${fileId}...`);
      await this.extractTrailer(localOriginalPath, trailerFile);

      // 5. UPLOAD KẾT QUẢ LÊN CLOUD
      const hlsKeyPrefix = `videos/${fileId}/hls`;
      this.logger.log(`Uploading HLS to S3 at ${hlsKeyPrefix}...`);
      const { streamingUrl } = await this.supabaseStorage.uploadHlsDirectory(hlsDir, hlsKeyPrefix);

      this.logger.log(`Uploading Trailer to Cloudinary...`);
      const trailerUrl = await this.cloudinaryStorage.uploadTrailer(
        createReadStream(trailerFile),
        `trailer-${fileId}-${randomUUID()}`,
      );

      // 6. CẬP NHẬT DB + GHI OUTBOX TRONG CÙNG MỘT ACID TRANSACTION
      processedEvent = new FileProcessedEvent(
        {
          fileId,
          streamingUrl,
          trailerUrl,
          fileSize: fileSizeBytes,
          uploadedBy,
          processedAt: new Date().toISOString(),
        },
        correlationId,
      );

      await this.prisma.client.$transaction(async (tx) => {
        await tx.mediaFile.update({
          where: { id: fileId },
          data: {
            status: 'AVAILABLE',
            streamingUrl,
            trailerUrl,
            processingError: null,
          },
        });

        await this.outboxService.put(processedEvent!, tx);
      });

      this.logger.log(`Successfully processed media file ${fileId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown processing error';
      const attempts =
        typeof job.opts.attempts === 'number' && job.opts.attempts > 0 ? job.opts.attempts : 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;

      if (isFinalAttempt) {
        const failedEvent = new FileProcessingFailedEvent(
          {
            fileId,
            reason,
            uploadedBy,
            failedAt: new Date().toISOString(),
          },
          correlationId,
        );

        await this.prisma.client.$transaction(async (tx) => {
          await tx.mediaFile.update({
            where: { id: fileId },
            data: {
              status: 'FAILED',
              processingError: reason,
            },
          });

          await this.outboxService.put(failedEvent, tx);
        });

        // Transaction committed → trigger relay immediately
        this.outboxService.notifyFlush();

        this.logger.error(
          `Failed to process media file ${fileId} after ${attempts} attempts`,
          reason,
        );
      } else {
        this.logger.warn(
          `Processing failed for media file ${fileId} at attempt ${job.attemptsMade + 1}/${attempts}. BullMQ will retry.`,
        );
      }

      throw error;
    } finally {
      // 7. CLEANUP: Xóa thư mục tạm (bao gồm cả file gốc vừa tải về và file HLS)
      await rm(tmpRoot, { recursive: true, force: true });
    }

    // ── Post-processing (success path only) ────────────────────
    // Runs AFTER the main try/catch/finally so failures here do NOT
    // trigger the processing-failed path.  The video artifacts (HLS,
    // trailer) and FileProcessedEvent are already committed in the DB.
    if (processedEvent) {
      // Flush the outbox AFTER all throwable processing steps have
      // completed, so a BullMQ retry cannot cause duplicate event
      // emissions via an already-relayed outbox entry.
      this.outboxService.notifyFlush();

      // Resolve the logical content identifier (tutorialId) from the
      // MediaFile record so downstream consumers receive a semantically
      // correct contentId rather than the raw fileId.
      let logicalContentId = fileId; // safe default
      try {
        const mediaFile = await this.prisma.client.mediaFile.findUnique({
          where: { id: fileId },
          select: { contentId: true },
        });
        logicalContentId = mediaFile?.contentId ?? fileId;
      } catch (lookupError) {
        this.logger.warn(
          `Could not resolve logicalContentId for file ${fileId}, using fileId as fallback`,
          lookupError instanceof Error ? lookupError.message : String(lookupError),
        );
      }

      try {
        await this.extractionQueue.add('extract-tutorial-content', {
          contentId: logicalContentId,
          contentType: 'TUTORIAL',
          fileIds: [fileId],
          uploadedBy,
          correlationId,
        });
      } catch (enqueueError) {
        // Log loudly but do NOT throw — the video processing succeeded.
        // Moderation can be triggered manually or via a sweep job later.
        this.logger.error(
          `Video ${fileId} processed successfully but failed to enqueue ` +
            `content extraction for tutorial ${logicalContentId}. ` +
            `Moderation will not run automatically until re-enqueued.`,
          enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
        );
      }
    }
  }

  /**
   * Executes the generate hls operation.
   *
   * @param inputPath - The inputPath parameter
   * @param outputDir - The outputDir parameter
   */
  private generateHls(inputPath: string, outputDir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-preset veryfast',
          '-g 48',
          '-sc_threshold 0',
          '-hls_time 6',
          '-hls_list_size 0',
          '-f hls',
        ])
        .output(path.join(outputDir, 'index.m3u8'))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Executes the extract trailer operation.
   *
   * @param inputPath - The inputPath parameter
   * @param outputPath - The outputPath parameter
   */
  private extractTrailer(inputPath: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(0)
        .duration(15)
        .outputOptions(['-movflags +faststart'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }
}
