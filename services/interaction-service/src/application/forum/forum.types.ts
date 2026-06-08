export type ForumTopicView = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  tag: string;
  majorId?: string;
  replies: number;
  views: string;
  viewCount: number;
  reactions: ForumTopicReactions;
  viewerReaction?: ForumTopicReactionType;
  activity: string;
  trending: boolean;
};

export type ForumTopicReactionType = 'like' | 'tym' | 'haha';

export type ForumTopicReactions = Record<ForumTopicReactionType, number>;

export type ForumMentionView = {
  userId: string;
  name: string;
  avatarUrl?: string;
};

export type ForumMessageView = {
  id: string;
  topicId?: string;
  author: string;
  message: string;
  time: string;
  tone: 'primary' | 'muted';
  mentions: ForumMentionView[];
};

export type ForumBootstrapView = {
  topics: ForumTopicView[];
  messages: ForumMessageView[];
  topicMessages: Record<string, ForumMessageView[]>;
};
