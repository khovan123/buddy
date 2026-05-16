import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TrackInteractionCommand } from '../../../application/commands/track-interaction.command';
import { TrackInteractionDto } from '../dtos/track-interaction.dto';

@Controller({ path: 'interactions', version: '1' })
export class InteractionController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
