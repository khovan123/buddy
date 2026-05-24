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
import {
  CONTENT_EXTRACTION_QUEUE,
  type ContentExtractionJobData,
} from './content-extraction.worker';

/** Represents the  video processor worker component. */
@Processor(QUEUES.VIDEO_PROCESSING_QUEUE)
export class VideoProcessorWorker extends WorkerHost {
  private readonly logger = new AppLogger(VideoProcessorWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly supabaseStorage: S3Service,
    private readonly cloudinaryStorage: CloudinaryService,
    @InjectQueue(CONTENT_EXTRACTION_QUEUE)
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
      const processedEvent = new FileProcessedEvent({
        fileId,
        streamingUrl,
        trailerUrl,
        fileSize: fileSizeBytes,
        uploadedBy,
        processedAt: new Date().toISOString(),
      });

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

        await this.outboxService.put(processedEvent, tx);
      });

      // Transaction committed → trigger relay immediately
      this.outboxService.notifyFlush();

      void this.extractionQueue
        .add('extract-tutorial-content', {
          contentId: fileId,
          contentType: 'TUTORIAL',
          fileIds: [fileId],
          uploadedBy,
          correlationId: processedEvent.correlationId ?? fileId,
        })
        .catch((error) => {
          this.logger.error(
            `Failed to queue transcript extraction for tutorial file ${fileId}`,
            error instanceof Error ? error.message : String(error),
          );
        });

      this.logger.log(`Successfully processed media file ${fileId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown processing error';
      const attempts =
        typeof job.opts.attempts === 'number' && job.opts.attempts > 0 ? job.opts.attempts : 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;

      if (isFinalAttempt) {
        const failedEvent = new FileProcessingFailedEvent({
          fileId,
          reason,
          uploadedBy,
          failedAt: new Date().toISOString(),
        });

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
