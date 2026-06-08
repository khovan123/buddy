import { successResponse } from '@libs/contracts';
import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  type MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { ForumService } from '../../../application/forum/forum.service';
import { ForumStreamService } from '../../../application/forum/forum-stream.service';
import { CreateForumMessageDto } from '../dtos/create-forum-message.dto';
import { CreateForumTopicDto } from '../dtos/create-forum-topic.dto';

@Controller({ path: 'forum', version: '1' })
export class ForumController {
  constructor(
    private readonly forum: ForumService,
    private readonly stream: ForumStreamService,
  ) {}

  @Get()
  async bootstrap(@Query('viewerId') viewerId?: string) {
    return successResponse(await this.forum.bootstrap(viewerId));
  }

  @Post('topics')
  @HttpCode(HttpStatus.CREATED)
  async createTopic(@Body() dto: CreateForumTopicDto) {
    return successResponse(
      await this.forum.createTopic({
        title: dto.title.trim(),
        excerpt: dto.excerpt.trim(),
        majorId: dto.majorId.trim(),
        tag: dto.tag.trim(),
        authorId: dto.userId,
        authorName: dto.authorName,
      }),
    );
  }

  @Patch('topics/:topicId/view')
  async viewTopic(@Param('topicId') topicId: string, @Body() dto?: { userId?: string }) {
    const topic = await this.forum.viewTopic(topicId, dto?.userId);
    if (!topic) {
      throw new NotFoundException('Forum topic not found');
    }
    return successResponse(topic);
  }

  @Post('topics/:topicId/reactions')
  @HttpCode(HttpStatus.OK)
  async reactToTopic(
    @Param('topicId') topicId: string,
    @Body() dto: { reaction?: 'like' | 'tym' | 'haha'; userId?: string },
  ) {
    if (!dto.userId || !dto.reaction) {
      throw new BadRequestException('Invalid forum reaction');
    }

    const topic = await this.forum.reactToTopic({
      topicId,
      reaction: dto.reaction,
      userId: dto.userId,
    });
    if (!topic) {
      throw new NotFoundException('Forum topic not found');
    }
    return successResponse(topic);
  }

  @Get('topics/:topicId/messages')
  async getTopicMessages(@Param('topicId') topicId: string) {
    return successResponse(await this.forum.getTopicMessages(topicId));
  }

  @Post('topics/:topicId/messages')
  @HttpCode(HttpStatus.CREATED)
  async createReply(@Param('topicId') topicId: string, @Body() dto: CreateForumMessageDto) {
    return successResponse(
      await this.forum.createReply({
        message: dto.message.trim(),
        topicId,
        mentions: dto.mentions,
        authorId: dto.userId,
        authorName: dto.authorName,
      }),
    );
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async createMessage(@Body() dto: CreateForumMessageDto) {
    return successResponse(
      await this.forum.createMessage({
        message: dto.message.trim(),
        topicId: dto.topicId,
        mentions: dto.mentions,
        authorId: dto.userId,
        authorName: dto.authorName,
      }),
    );
  }

  @Sse('events')
  streamForum(): Observable<MessageEvent> {
    return this.stream.subscribe();
  }
}
