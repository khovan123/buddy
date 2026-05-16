import { AppLogger, JwtAuthGuard } from '@libs/common';
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';

import { successResponse } from '@libs/contracts';
import { ConfirmResourceUploadCommand } from '../../../application/commands/confirm-resource-upload.command';
import { ConfirmTutorialUploadCommand } from '../../../application/commands/confirm-tutorial-upload.command';
import { GetFileStatusQuery } from '../../../application/queries/get-file-status.query';
import { GetUploadHistoryQuery } from '../../../application/queries/get-upload-history.query';
import type { ProcessingStatus } from '../../../domain/entities/file-metadata.entity';
import { ConfirmResourceUploadDto } from '../dtos/confirm-resource-upload.dto';
import { ConfirmTutorialUploadDto } from '../dtos/confirm-tutorial-upload.dto';

/** Controller handling incoming requests for Upload. */
@Controller({ path: 'uploads', version: '1' })
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new AppLogger(UploadController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /v1/uploads/tutorial/confirm
   * Client chủ động gọi API này sau khi đã upload file video (tutorial) 100% lên Supabase S3 qua Presigned URL.
   */
  @Post('tutorial/confirm')
  async confirmTutorialUpload(
    @Body() dto: ConfirmTutorialUploadDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    this.logger.log(`Client confirmed upload for tutorial file: ${dto.s3Key}`);

    return this.commandBus.execute(
      new ConfirmTutorialUploadCommand(dto.fileId, dto.s3Key, req.user.sub),
    );
  }

  /**
   * POST /v1/uploads/resource/confirm
   * Executes the confirm resource upload operation.
   *
   * @param dto - The dto parameter
   * @param req - The req parameter
   */
  @Post('resource/confirm')
  async confirmResourceUpload(
    @Body() dto: ConfirmResourceUploadDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { fileIds, resourceId } = dto;
    const result = await this.commandBus.execute(
      new ConfirmResourceUploadCommand(resourceId, fileIds, req.user.sub),
    );
    return successResponse(result);
  }

  /**
   * GET /v1/uploads/history
   * Returns paginated upload history for the authenticated user.
   */
  @Get('history')
  async getUploadHistory(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const validStatuses = ['PENDING', 'PROCESSING', 'AVAILABLE', 'FAILED'];
    const parsedStatus =
      status && validStatuses.includes(status.toUpperCase())
        ? (status.toUpperCase() as ProcessingStatus)
        : undefined;

    return this.queryBus.execute(
      new GetUploadHistoryQuery(
        req.user.sub,
        Math.max(Number.parseInt(page || '1', 10), 1),
        Math.min(Math.max(Number.parseInt(limit || '20', 10), 1), 50),
        parsedStatus,
      ),
    );
  }

  /**
   * Executes the get file status operation.
   *
   * @param id - The id parameter
   */
  @Get('files/:id/status')
  async getFileStatus(@Param('id') id: string) {
    return this.queryBus.execute(new GetFileStatusQuery(id));
  }
}
