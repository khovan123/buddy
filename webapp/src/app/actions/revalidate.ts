"use server"

import { revalidateTag } from "next/cache"

/**
 * Server action to revalidate Next.js data cache tags.
 * This allows client-side components (like RTK Query mutations)
 * to trigger server-side cache invalidation.
 */
export async function revalidateCacheTag(tag: string) {
  // @ts-expect-error Next.js 15 types
  revalidateTag(tag)
}
