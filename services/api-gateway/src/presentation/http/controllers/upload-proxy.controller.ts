import { JwtAuthGuard } from '@libs/common';
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for UploadProxy. */
@Controller({ path: 'uploads', version: '1' })
@UseGuards(JwtAuthGuard)
export class UploadProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Executes the get upload url operation.
   *
   * @param req - The req parameter
   * @param fileName - The fileName parameter
   * @param fileSizeBytes - The fileSizeBytes parameter
   * @param uploadType - The uploadType parameter
   * @param videoDurationSeconds - The videoDurationSeconds parameter
   */
  @Get('url')
  getUploadUrl(
    @Req() req: FastifyRequest,
    @Query('fileName') fileName?: string,
    @Query('fileSizeBytes') fileSizeBytes?: string,
    @Query('uploadType') uploadType?: string,
    @Query('videoDurationSeconds') videoDurationSeconds?: string,
  ) {
    const query: Record<string, string> = {};
    if (fileName) query.fileName = fileName;
    if (fileSizeBytes) query.fileSizeBytes = fileSizeBytes;
    if (uploadType) query.uploadType = uploadType;
    if (videoDurationSeconds) query.videoDurationSeconds = videoDurationSeconds;

    return this.proxy.forward(req, {
      service: 'upload',
      path: '/v1/uploads/url',
      method: 'GET',
      query,
    });
  }

  /**
   * Proxies GET /v1/uploads/history to the upload-service.
   *
   * @param req - The req parameter
   */
  @Get('history')
  getUploadHistory(
    @Req() req: FastifyRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const query: Record<string, string> = {};
    if (page) query.page = page;
    if (limit) query.limit = limit;
    if (status) query.status = status;

    return this.proxy.forward(req, {
      service: 'upload',
      path: '/v1/uploads/history',
      method: 'GET',
      query,
    });
  }

  /**
   * Proxies POST /v1/uploads/tutorial/confirm to the upload-service.
   * Called by the client after successfully uploading a tutorial video to S3.
   */
  @Post('tutorial/confirm')
  confirmTutorialUpload(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'upload',
      path: '/v1/uploads/tutorial/confirm',
      method: 'POST',
      body,
    });
  }

  /**
   * Proxies POST /v1/uploads/resource/confirm to the upload-service.
   * Called by the client after successfully uploading resource files to S3.
   */
  @Post('resource/confirm')
  confirmResourceUpload(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'upload',
      path: '/v1/uploads/resource/confirm',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the process video operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('videos/process')
  processVideo(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'upload',
      path: '/v1/uploads/videos/process',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the get video status operation.
   *
   * @param id - The id parameter
   * @param req - The req parameter
   */
  @Get('videos/:id')
  getVideoStatus(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'upload',
      path: `/v1/uploads/videos/${id}`,
      method: 'GET',
    });
  }
}
