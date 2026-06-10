import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ForumNotificationPublisher } from '../../infrastructure/messaging/publishers/forum-notification.publisher';
import {
  ForumMessage,
  type ForumMessageDocument,
} from '../../infrastructure/persistence/mongo/schemas/forum-message.schema';
import {
  ForumTopic,
  type ForumTopicDocument,
} from '../../infrastructure/persistence/mongo/schemas/forum-topic.schema';
import { ForumStreamService } from './forum-stream.service';
import type {
  ForumBootstrapView,
  ForumMentionView,
  ForumMessageView,
  ForumTopicReactionType,
  ForumTopicView,
} from './forum.types';

type CreateTopicInput = {
  title: string;
  excerpt: string;
  majorId: string;
  tag: string;
  authorId?: string;
  authorName?: string;
};

type CreateMessageInput = {
  message: string;
  topicId?: string;
  mentions?: ForumMentionView[];
  authorId?: string;
  authorName?: string;
};

type ReactToTopicInput = {
  topicId: string;
  reaction: ForumTopicReactionType;
  userId: string;
};

@Injectable()
export class ForumService {
  constructor(
    @InjectModel(ForumTopic.name)
    private readonly topicModel: Model<ForumTopicDocument>,
    @InjectModel(ForumMessage.name)
    private readonly messageModel: Model<ForumMessageDocument>,
    private readonly stream: ForumStreamService,
    private readonly forumNotificationPublisher: ForumNotificationPublisher,
  ) {}

  async bootstrap(viewerId?: string): Promise<ForumBootstrapView> {
    const [topics, messages, topicMessages] = await Promise.all([
      this.topicModel.find().sort({ lastActivityAt: -1, createdAt: -1 }).limit(30).exec(),
      this.messageModel
        .find({ topicId: { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(60)
        .exec(),
      this.messageModel
        .find({ topicId: { $exists: true } })
        .sort({ createdAt: 1 })
        .limit(300)
        .exec(),
    ]);

    const topicMessageMap = topicMessages.reduce<Record<string, ForumMessageView[]>>(
      (acc, message) => {
        if (!message.topicId) {
          return acc;
        }

        acc[message.topicId] = [...(acc[message.topicId] ?? []), this.toMessageView(message)];
        return acc;
      },
      {},
    );

    return {
      topics: topics.map((topic) => this.toTopicView(topic, viewerId)),
      messages: messages.reverse().map((message) => this.toMessageView(message)),
      topicMessages: topicMessageMap,
    };
  }

  async createTopic(input: CreateTopicInput): Promise<ForumTopicView> {
    const topic = await this.topicModel.create({
      title: input.title,
      excerpt: input.excerpt,
      authorId: input.authorId,
      authorName: this.resolveAuthorName(input.authorName, input.authorId),
      tag: input.tag,
      majorId: input.majorId,
      replyCount: 0,
      viewCount: 0,
      trending: false,
      lastActivityAt: new Date(),
    });
    const view = this.toTopicView(topic, input.authorId);

    this.stream.publish({ type: 'forum.topic', data: this.toTopicView(topic) });

    return view;
  }

  async createMessage(input: CreateMessageInput): Promise<ForumMessageView> {
    const mentions = this.normalizeMentions(input.mentions);
    const message = await this.messageModel.create({
      topicId: input.topicId,
      authorId: input.authorId,
      authorName: this.resolveAuthorName(input.authorName, input.authorId),
      message: input.message,
      mentions,
    });

    const topic = input.topicId
      ? await this.topicModel
          .findOneAndUpdate(
            { _id: input.topicId },
            { $inc: { replyCount: 1 }, $set: { lastActivityAt: new Date() } },
            { new: true },
          )
          .exec()
      : null;

    await this.publishMentionNotifications({
      topic,
      message,
      mentions,
      actorId: input.authorId,
      actorName: this.resolveAuthorName(input.authorName, input.authorId),
    });

    const view = this.toMessageView(message);

    this.stream.publish({ type: 'forum.message', data: view });

    return view;
  }

  async viewTopic(topicId: string, viewerId?: string): Promise<ForumTopicView | null> {
    const topic = await this.topicModel
      .findOneAndUpdate({ _id: topicId }, { $inc: { viewCount: 1 } }, { new: true })
      .exec();

    if (!topic) {
      return null;
    }

    const view = this.toTopicView(topic, viewerId);
    this.stream.publish({ type: 'forum.topic', data: this.toTopicView(topic) });
    return view;
  }

  async reactToTopic(input: ReactToTopicInput): Promise<ForumTopicView | null> {
    const topic = await this.topicModel.findById(input.topicId).exec();

    if (!topic) {
      return null;
    }

    const field = this.reactionField(input.reaction);
    const wasActive = (topic[field] ?? []).includes(input.userId);

    topic.likeUserIds = (topic.likeUserIds ?? []).filter((id) => id !== input.userId);
    topic.tymUserIds = (topic.tymUserIds ?? []).filter((id) => id !== input.userId);
    topic.hahaUserIds = (topic.hahaUserIds ?? []).filter((id) => id !== input.userId);

    if (!wasActive) {
      topic[field] = [...(topic[field] ?? []), input.userId];
    }
    topic.lastActivityAt = new Date();
    await topic.save();

    const view = this.toTopicView(topic, input.userId);
    this.stream.publish({ type: 'forum.topic', data: this.toTopicView(topic) });
    return view;
  }

  async getTopicMessages(topicId: string): Promise<ForumMessageView[]> {
    const messages = await this.messageModel
      .find({ topicId })
      .sort({ createdAt: 1 })
      .limit(100)
      .exec();
    return messages.map((message) => this.toMessageView(message));
  }

  async createReply(input: CreateMessageInput & { topicId: string }): Promise<ForumMessageView> {
    return this.createMessage(input);
  }

  private async publishMentionNotifications(input: {
    topic: ForumTopicDocument | null;
    message: ForumMessageDocument;
    mentions: ForumMentionView[];
    actorId?: string;
    actorName: string;
  }) {
    await Promise.all(
      input.mentions
        .filter((mention) => mention.userId !== input.actorId)
        .map((mention) =>
          this.forumNotificationPublisher.publishMention({
            mentionedUserId: mention.userId,
            mentionedUserName: mention.name,
            actorId: input.actorId,
            actorName: input.actorName,
            topicId: input.topic?.id,
            topicTitle: input.topic?.title ?? 'Forum chat',
            messageId: input.message.id,
            excerpt: input.message.message.slice(0, 180),
            href: input.topic
              ? `/forum?topic=${input.topic.id}&comment=${input.message.id}`
              : `/forum?comment=${input.message.id}`,
            createdAt: new Date().toISOString(),
          }),
        ),
    );
  }

  private reactionField(reaction: ForumTopicReactionType) {
    switch (reaction) {
      case 'tym':
        return 'tymUserIds' as const;
      case 'haha':
        return 'hahaUserIds' as const;
      default:
        return 'likeUserIds' as const;
    }
  }

  private normalizeMentions(mentions?: ForumMentionView[]): ForumMentionView[] {
    if (!Array.isArray(mentions)) {
      return [];
    }

    const seen = new Set<string>();
    return mentions
      .filter((mention) => mention.userId?.trim() && mention.name?.trim())
      .filter((mention) => {
        if (seen.has(mention.userId)) {
          return false;
        }
        seen.add(mention.userId);
        return true;
      })
      .slice(0, 10)
      .map((mention) => ({
        userId: mention.userId.trim(),
        name: mention.name.trim().slice(0, 120),
        avatarUrl: mention.avatarUrl?.trim() || undefined,
      }));
  }

  private toTopicView(topic: ForumTopicDocument, viewerId?: string): ForumTopicView {
    return {
      id: topic.id,
      title: topic.title,
      excerpt: topic.excerpt,
      author: topic.authorName,
      tag: topic.tag,
      majorId: topic.majorId,
      replies: topic.replyCount,
      views: this.formatCount(topic.viewCount),
      viewCount: topic.viewCount,
      reactions: {
        like: topic.likeUserIds?.length ?? 0,
        tym: topic.tymUserIds?.length ?? 0,
        haha: topic.hahaUserIds?.length ?? 0,
      },
      viewerReaction: this.resolveViewerReaction(topic, viewerId),
      activity: this.formatActivity(topic.lastActivityAt ?? topic.updatedAt ?? topic.createdAt),
      trending: topic.trending,
    };
  }

  private resolveViewerReaction(
    topic: ForumTopicDocument,
    viewerId?: string,
  ): ForumTopicReactionType | undefined {
    if (!viewerId) {
      return undefined;
    }

    if (topic.likeUserIds?.includes(viewerId)) {
      return 'like';
    }

    if (topic.tymUserIds?.includes(viewerId)) {
      return 'tym';
    }

    if (topic.hahaUserIds?.includes(viewerId)) {
      return 'haha';
    }

    return undefined;
  }

  private toMessageView(message: ForumMessageDocument): ForumMessageView {
    return {
      id: message.id,
      topicId: message.topicId,
      author: message.authorName,
      message: message.message,
      time: new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(message.createdAt ?? new Date()),
      tone: 'muted',
      mentions: message.mentions ?? [],
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
