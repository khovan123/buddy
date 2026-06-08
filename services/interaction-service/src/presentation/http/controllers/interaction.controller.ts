import { successResponse } from '@libs/contracts';
import type { InteractionContentType } from '@libs/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Sse,
  type MessageEvent,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

import { TrackInteractionCommand } from '../../../application/commands/track-interaction.command';
import { InteractionStreamService } from '../../../application/interactions/interaction-stream.service';
import type { IInteractionRepository } from '../../../domain/repositories/interaction.repository.interface';
import { INTERACTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { TrackInteractionDto } from '../dtos/track-interaction.dto';

@Controller({ path: 'interactions', version: '1' })
export class InteractionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly interactionStream: InteractionStreamService,
    @Inject(INTERACTION_REPOSITORY)
    private readonly repository: IInteractionRepository,
  ) {}

  /**
   * POST /v1/interactions — Record a user interaction.
   * Returns 202 Accepted immediately (fire-and-forget for frontend).
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async track(@Body() dto: TrackInteractionDto): Promise<{ status: string }> {
    await this.commandBus.execute(
      new TrackInteractionCommand(
        dto.userId,
        dto.itemId,
        dto.itemType,
        dto.action,
        dto.ratingValue,
        dto.commentId,
        dto.majorId,
        dto.courseId,
        dto.semester,
      ),
    );
    return { status: 'accepted' };
  }

  @Get('stats')
  async getStats(
    @Req() req: FastifyRequest & { user?: { sub?: string } },
    @Query('items') itemsParam?: string,
    @Query('itemId') itemId?: string,
    @Query('itemType') itemType?: InteractionContentType,
    @Query('userId') userId?: string,
  ) {
    const items = this.parseItems(itemsParam, itemId, itemType);
    const stats = await this.repository.getStatsForItems({
      items,
      userId: userId ?? req.user?.sub,
    });

    return successResponse(stats);
  }

  @Sse('stream')
  streamInteractions(): Observable<MessageEvent> {
    return this.interactionStream.subscribe();
  }

  private parseItems(
    itemsParam?: string,
    itemId?: string,
    itemType?: InteractionContentType,
  ): Array<{ itemId: string; itemType: InteractionContentType }> {
    if (itemsParam) {
      return itemsParam
        .split(',')
        .map((entry) => {
          const [type, id] = entry.split(':');
          return { itemId: id, itemType: type as InteractionContentType };
        })
        .filter((item) => this.isInteractionContentType(item.itemType) && Boolean(item.itemId));
    }

    if (itemId && itemType && this.isInteractionContentType(itemType)) {
      return [{ itemId, itemType }];
    }

    return [];
  }

  private isInteractionContentType(value: unknown): value is InteractionContentType {
    return (
      value === 'RESOURCE' ||
      value === 'TUTORIAL' ||
      value === 'RESOURCE_COLLECTION' ||
      value === 'TUTORIAL_COLLECTION'
    );
  }
}
