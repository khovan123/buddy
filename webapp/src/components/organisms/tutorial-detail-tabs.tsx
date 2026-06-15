"use client"

import { useState } from "react"

import { TutorialAttachedResources } from "@/components/organisms/tutorial-attached-resources"
import { Card } from "@/components/ui/card"
import type {
  TutorialAttachedResource,
  TutorialDiscussionItem,
} from "@/features/library/types"

type TutorialTabKey = "description" | "resources" | "discussion"

type TutorialDetailTabsProps = {
  tutorialTitle: string
  tutorialAuthor: string
  description: string[]
  attachedResources: TutorialAttachedResource[]
  discussion: TutorialDiscussionItem[]
}

export function TutorialDetailTabs({
  tutorialTitle,
  tutorialAuthor,
  description,
  attachedResources,
  discussion,
}: TutorialDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TutorialTabKey>("resources")

  const resourcesLabel = `Attached Resources (${attachedResources.length})`

  return (
    <>
      <div className="mb-8 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("description")}
          className={
            activeTab === "description"
              ? "border-b-2 border-primary px-6 py-4 text-sm font-bold text-primary"
              : "px-6 py-4 text-sm font-medium text-foreground/60 hover:text-foreground"
          }
        >
          Description
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={
            activeTab === "resources"
              ? "border-b-2 border-primary px-6 py-4 text-sm font-bold text-primary"
              : "px-6 py-4 text-sm font-medium text-foreground/60 hover:text-foreground"
          }
        >
          {resourcesLabel}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("discussion")}
          className={
            activeTab === "discussion"
              ? "border-b-2 border-primary px-6 py-4 text-sm font-bold text-primary"
              : "px-6 py-4 text-sm font-medium text-foreground/60 hover:text-foreground"
          }
        >
          Discussion
        </button>
      </div>

      {activeTab === "description" ? (
        <Card className="space-y-4 rounded-2xl bg-card p-6 shadow-none">
          {description.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-foreground/75">
              {paragraph}
            </p>
          ))}
        </Card>
      ) : null}

      {activeTab === "resources" ? (
        <TutorialAttachedResources
          resources={attachedResources}
          tutorialTitle={tutorialTitle}
          tutorialAuthor={tutorialAuthor}
        />
      ) : null}

      {activeTab === "discussion" ? (
        <div className="space-y-3">
          {discussion.length > 0 ? (
            discussion.map((item) => (
              <Card
                key={`${item.author}-${item.postedAt}`}
                className="space-y-2 rounded-2xl bg-card p-5 shadow-none"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {item.author}
                  </p>
                  <p className="text-xs font-medium text-foreground/50">
                    {item.postedAt}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-foreground/75">
                  {item.message}
                </p>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl bg-card p-5 shadow-none">
              <p className="text-sm text-foreground/70">
                No discussion yet. Be the first to ask a question.
              </p>
            </Card>
          )}
        </div>
      ) : null}
    </>
  )
}
