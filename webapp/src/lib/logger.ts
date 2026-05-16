/* eslint-disable no-console */

export const logger = {
  info: (...args: unknown[]) => console.log("[INFO]", ...args),
  warn: (...args: unknown[]) => console.warn("[WARN]", ...args),
  error: (...args: unknown[]) => console.error("[ERROR]", ...args),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[DEBUG]", ...args)
    }
  },
}
