export interface RoleAccessInput {
  role?: string | null
  roles?: string[] | null
  subscriptionPlan?: string | null
}

interface AccessTokenClaims {
  roles?: string[]
  role?: string
  subscriptionPlan?: string
}

const normalize = (value?: string | null) =>
  value?.trim().replace(/-/g, "_").toUpperCase() ?? ""

export const getRoleValues = (input?: RoleAccessInput | null) => {
  if (!input) {
    return []
  }

  const values = [input.role, ...(input.roles ?? [])]
    .map(normalize)
    .filter(Boolean)

  return Array.from(new Set(values))
}

export const isAdminAccess = (input?: RoleAccessInput | null) =>
  getRoleValues(input).includes("ADMIN")

export const isCreatorAccess = (input?: RoleAccessInput | null) => {
  const roles = getRoleValues(input)
  const plan = normalize(input?.subscriptionPlan)

  return roles.includes("CREATOR") || plan.startsWith("CREATOR")
}

export const decodeAccessTokenClaims = (
  accessToken?: string | null
): AccessTokenClaims | null => {
  if (!accessToken) {
    return null
  }

  const [, payload] = accessToken.split(".")
  if (!payload) {
    return null
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "="
    )
    return JSON.parse(atob(paddedPayload)) as AccessTokenClaims
  } catch {
    return null
  }
}

export const buildRoleAccessInput = (
  input?: RoleAccessInput | null,
  accessToken?: string | null
): RoleAccessInput => {
  const claims = decodeAccessTokenClaims(accessToken)

  const role =
    input?.role?.trim() ||
    claims?.role?.trim() ||
    claims?.roles?.[0]?.trim() ||
    null

  return {
    role,
    roles:
      input?.roles && input.roles.length > 0
        ? input.roles
        : claims?.roles ?? null,
    subscriptionPlan:
      input?.subscriptionPlan?.trim() || claims?.subscriptionPlan?.trim() || null,
  }
}
