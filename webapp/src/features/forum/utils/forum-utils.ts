import { Heart, Laugh, ThumbsUp } from "lucide-react"

import type {
  ForumMessage,
  ForumMention,
  ForumMentionCandidate,
  ForumTopic,
  ForumTopicReaction,
} from "@/features/forum/types"

export const REACTION_META: Array<{
  type: ForumTopicReaction
  label: string
  icon: typeof ThumbsUp
  activeClassName: string
}> = [
  {
    type: "like",
    label: "Like",
    icon: ThumbsUp,
    activeClassName: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    type: "tym",
    label: "Tym",
    icon: Heart,
    activeClassName: "bg-rose-600 text-white hover:bg-rose-600/90",
  },
  {
    type: "haha",
    label: "Haha",
    icon: Laugh,
    activeClassName: "bg-amber-500 text-white hover:bg-amber-500/90",
  },
]

export function upsertTopic(topics: ForumTopic[], topic: ForumTopic) {
  const existingIndex = topics.findIndex(
    (currentTopic) => currentTopic.id === topic.id
  )

  if (existingIndex < 0) {
    return [topic, ...topics]
  }

  return topics.map((currentTopic) =>
    currentTopic.id === topic.id
      ? {
          ...topic,
          viewerReaction: topic.viewerReaction ?? currentTopic.viewerReaction,
        }
      : currentTopic
  )
}

export function getTopicReactions(topic: ForumTopic) {
  return {
    like: topic.reactions?.like ?? 0,
    tym: topic.reactions?.tym ?? 0,
    haha: topic.reactions?.haha ?? 0,
  }
}

export function applyViewerReaction(
  topic: ForumTopic,
  reaction: ForumTopicReaction
): ForumTopic {
  const reactions = getTopicReactions(topic)
  const previousReaction = topic.viewerReaction
  const nextReaction = previousReaction === reaction ? undefined : reaction

  if (previousReaction) {
    reactions[previousReaction] = Math.max(0, reactions[previousReaction] - 1)
  }

  if (nextReaction) {
    reactions[nextReaction] += 1
  }

  return {
    ...topic,
    reactions,
    viewerReaction: nextReaction,
  }
}

export function getTopicScore(topic: ForumTopic) {
  const reactions = getTopicReactions(topic)
  return topic.replies + reactions.like + reactions.tym + reactions.haha
}

export function getMessageMentions(message: ForumMessage) {
  return message.mentions ?? []
}

export function addMessage(messages: ForumMessage[], message: ForumMessage) {
  if (messages.some((currentMessage) => currentMessage.id === message.id)) {
    return messages
  }

  return [...messages, message]
}

export function addMention(
  mentions: ForumMention[],
  candidate: ForumMentionCandidate
) {
  if (mentions.some((mention) => mention.userId === candidate.userId)) {
    return mentions
  }

  return [...mentions, candidate]
}

export function getMentionQuery(value: string) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(value)
  return match ? match[1] : null
}
