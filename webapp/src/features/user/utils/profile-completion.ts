import type { UserProfile } from "@/features/user/services/user-api"

export type MissingProfileField = {
  key: "profile" | "careerId" | "majorId" | "courseId" | "skillIds"
  label: string
}

export function getMissingProfileFields(
  user: UserProfile | null
): MissingProfileField[] {
  const profile = user?.profile

  if (!profile) {
    return [{ key: "profile", label: "thông tin hồ sơ" }]
  }

  const missing: MissingProfileField[] = []

  if (!profile.careerId) {
    missing.push({ key: "careerId", label: "mục tiêu nghề nghiệp" })
  }
  if (!profile.majorId) {
    missing.push({ key: "majorId", label: "chuyên ngành" })
  }
  if (!profile.courseId) {
    missing.push({ key: "courseId", label: "môn học" })
  }
  if (!profile.skillIds || profile.skillIds.length === 0) {
    missing.push({ key: "skillIds", label: "kỹ năng nổi bật" })
  }

  return missing
}

export function isProfileComplete(user: UserProfile | null) {
  return getMissingProfileFields(user).length === 0
}
