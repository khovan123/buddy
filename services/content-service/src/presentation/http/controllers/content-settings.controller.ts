import { JwtAuthGuard, Public, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ContentSettingsService } from '../../../infrastructure/services/content-settings.service';
import { UpdateModerationSettingsDto } from '../dtos/update-moderation-settings.dto';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    sub: string;
    roles?: string[];
  };
};

@Controller({ path: 'content-settings', version: '1' })
@UseGuards(JwtAuthGuard)
export class ContentSettingsController {
  constructor(private readonly settings: ContentSettingsService) {}

  @Get('moderation')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getModerationSettings(@Req() req: AuthenticatedRequest) {
    this.assertAdmin(req.user?.roles ?? []);
    const result = await this.settings.getModerationSettings();
    return successResponse(result, 'Get moderation settings successful', getCorrelationId());
  }

  @Get('moderation/runtime')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getRuntimeModerationSettings() {
    const result = await this.settings.getModerationSettings();
    return successResponse(
      { enabled: result.enabled },
      'Get runtime moderation settings successful',
      getCorrelationId(),
    );
  }

  @Patch('moderation')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateModerationSettings(
    @Body() dto: UpdateModerationSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req.user?.roles ?? []);
    const result = await this.settings.updateModerationSettings(dto.enabled, req.user.sub);
    return successResponse(result, 'Update moderation settings successful', getCorrelationId());
  }

  private assertAdmin(roles: string[]) {
    const hasAdminRole = roles.some((role) => role.trim().toUpperCase() === 'ADMIN');
    if (!hasAdminRole) {
      throw new ForbiddenException('Admin role required');
    }
  }
}
