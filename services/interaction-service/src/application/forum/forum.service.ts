import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ForumMessage,
  type ForumMessageDocument,
} from '../../infrastructure/persistence/mongo/schemas/forum-message.schema';
import {
  ForumTopic,
  type ForumTopicDocument,
} from '../../infrastructure/persistence/mongo/schemas/forum-topic.schema';
import { ForumStreamService } from './forum-stream.service';
import type { ForumBootstrapView, ForumMessageView, ForumTopicView } from './forum.types';

type CreateTopicInput = {
  title: string;
  excerpt: string;
  authorId?: string;
  authorName?: string;
};

type CreateMessageInput = {
  message: string;
  topicId?: string;
  authorId?: string;
  authorName?: string;
};

@Injectable()
export class ForumService {
  constructor(
    @InjectModel(ForumTopic.name)
    private readonly topicModel: Model<ForumTopicDocument>,
    @InjectModel(ForumMessage.name)
    private readonly messageModel: Model<ForumMessageDocument>,
    private readonly stream: ForumStreamService,
  ) {}

  async bootstrap(): Promise<ForumBootstrapView> {
    const [topics, messages] = await Promise.all([
      this.topicModel.find().sort({ lastActivityAt: -1, createdAt: -1 }).limit(30).exec(),
      this.messageModel
        .find({ topicId: { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(60)
        .exec(),
    ]);

    return {
      topics: topics.map((topic) => this.toTopicView(topic)),
      messages: messages.reverse().map((message) => this.toMessageView(message)),
    };
  }

  async createTopic(input: CreateTopicInput): Promise<ForumTopicView> {
    const topic = await this.topicModel.create({
      title: input.title,
      excerpt: input.excerpt,
      authorId: input.authorId,
      authorName: this.resolveAuthorName(input.authorName, input.authorId),
      tag: 'New',
      replyCount: 0,
      viewCount: 0,
      trending: false,
      lastActivityAt: new Date(),
    });
    const view = this.toTopicView(topic);

    this.stream.publish({ type: 'forum.topic', data: view });

    return view;
  }

  async createMessage(input: CreateMessageInput): Promise<ForumMessageView> {
    const message = await this.messageModel.create({
      topicId: input.topicId,
      authorId: input.authorId,
      authorName: this.resolveAuthorName(input.authorName, input.authorId),
      message: input.message,
    });

    if (input.topicId) {
      await this.topicModel
        .updateOne(
          { _id: input.topicId },
          { $inc: { replyCount: 1 }, $set: { lastActivityAt: new Date() } },
        )
        .exec();
    }

    const view = this.toMessageView(message);

    this.stream.publish({ type: 'forum.message', data: view });

    return view;
  }

  private toTopicView(topic: ForumTopicDocument): ForumTopicView {
    return {
      id: topic.id,
      title: topic.title,
      excerpt: topic.excerpt,
      author: topic.authorName,
      tag: topic.tag,
      replies: topic.replyCount,
      views: this.formatCount(topic.viewCount),
      activity: this.formatActivity(topic.lastActivityAt ?? topic.updatedAt ?? topic.createdAt),
      trending: topic.trending,
    };
  }

  private toMessageView(message: ForumMessageDocument): ForumMessageView {
    return {
      id: message.id,
      author: message.authorName,
      message: message.message,
      time: new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(message.createdAt ?? new Date()),
      tone: 'muted',
    };
  }

  private resolveAuthorName(authorName?: string, authorId?: string): string {
    if (authorName?.trim()) {
      return authorName.trim().slice(0, 120);
    }

    if (authorId) {
      return `Member ${authorId.slice(0, 8)}`;
    }

    return 'Buddy learner';
  }

  private formatActivity(value?: Date): string {
    if (!value) {
      return 'Just now';
    }

    const elapsedMs = Date.now() - value.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsedMs < minute) {
      return 'Just now';
    }

    if (elapsedMs < hour) {
      return `${Math.floor(elapsedMs / minute)} min ago`;
    }

    if (elapsedMs < day) {
      return `${Math.floor(elapsedMs / hour)} hr ago`;
    }

    return `${Math.floor(elapsedMs / day)} day ago`;
  }

  private formatCount(value: number): string {
    if (value < 1000) {
      return value.toString();
    }

    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
}
