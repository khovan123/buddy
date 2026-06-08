export type ForumTopicView = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  tag: string;
  replies: number;
  views: string;
  activity: string;
  trending: boolean;
};

export type ForumMessageView = {
  id: string;
  author: string;
  message: string;
  time: string;
  tone: 'primary' | 'muted';
};

export type ForumBootstrapView = {
  topics: ForumTopicView[];
  messages: ForumMessageView[];
};
