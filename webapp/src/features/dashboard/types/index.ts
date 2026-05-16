// ─────────────────────────────────────────────────────────────
// Dashboard Types — re-exports from canonical sources
// ─────────────────────────────────────────────────────────────

// Re-export content types (Major, Course, enums)
export {
  type Major,
  MajorStatus,
  type Course,
  CourseStatus,
} from "@/features/content/types"

// Re-export profile-metadata types (CareerItem, SkillItem)
export { type CareerItem, type SkillItem } from "@/types/shared"

// ── Dashboard-specific types ────────────────────────────────

export interface ContentMetaResponse {
  majors: Major[]
  courses: Course[]
}

// need local import for the interface above
import type { Major, Course } from "@/features/content/types"
