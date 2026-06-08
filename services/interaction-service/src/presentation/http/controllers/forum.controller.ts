import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
  async bootstrap() {
    return successResponse(await this.forum.bootstrap());
  }

  @Post('topics')
  @HttpCode(HttpStatus.CREATED)
  async createTopic(@Body() dto: CreateForumTopicDto) {
    return successResponse(
      await this.forum.createTopic({
        title: dto.title.trim(),
        excerpt: dto.excerpt.trim(),
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
