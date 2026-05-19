import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const getSnapshot = React.useCallback(() => {
    if (typeof globalThis.window === "undefined") {
      return false
    }

    return globalThis.window.innerWidth < MOBILE_BREAKPOINT
  }, [])

  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mql = globalThis.window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    )
    mql.addEventListener("change", onStoreChange)

    return () => mql.removeEventListener("change", onStoreChange)
  }, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
