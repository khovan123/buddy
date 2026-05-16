// ─────────────────────────────────────────────────────────────
// Shared Types — used across features (user, dashboard, content)
// Source of truth for profile-metadata types
// ─────────────────────────────────────────────────────────────

export interface CareerItem {
  id: string
  name: string
  description: string
  status: string
}

export interface SkillItem {
  id: string
  name: string
  careerId: string
  status: string
}
