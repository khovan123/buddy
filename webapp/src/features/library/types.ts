import type { CollectionCardData } from "@/components/molecules/collection-card"
import type {
  LibraryAsset,
  LibraryAssetKind,
} from "@/features/library/components/library-asset-card"

export type TutorialResourceItem = {
  slug: string
  sourcePath: string
  title: string
  description: string
  author: string
  image: string
  fileType: "pdf" | "docx" | "pptx"
  kind: Exclude<LibraryAssetKind, typeof LibraryAssetKind.Tutorial>
}

export type TutorialAttachedResource = {
  title: string
  meta: string
  kind: "pdf" | "docx" | "pptx"
  href: string
  downloadUrl: string
}

export type TutorialInstructor = {
  name: string
  role: string
  bio: string
  image: string
}

export type TutorialDiscussionItem = {
  author: string
  postedAt: string
  message: string
}

type CurriculumLesson = {
  id: string
  title: string
  duration: string
  isPreview?: boolean
  videoSource: string
  poster: string
  description: string[]
  resources: TutorialResourceItem[]
  discussion: TutorialDiscussionItem[]
  instructor: TutorialInstructor
}

export type LibraryTutorialCollection = CollectionCardData & {
  slug: string
  tagline: string
  students: string
  totalDuration: string
  oldPrice: string
  author: TutorialInstructor
  tutorials: CurriculumLesson[]
}

export type LibraryCatalog = {
  resources: LibraryAsset[]
  tutorials: LibraryAsset[]
  resourceCollections: CollectionCardData[]
  tutorialCollections: CollectionCardData[]
}
