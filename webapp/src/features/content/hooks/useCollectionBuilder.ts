import { useCallback, useMemo, useReducer } from "react"

import type {
  ResourceQueryItem,
  TutorialQueryItem,
} from "@/features/content/types"

// ── Types ───────────────────────────────────────────────────────
export type ContentItem = ResourceQueryItem | TutorialQueryItem
export type FilterType = "all" | "video" | "pdf" | "quiz"

interface BuilderState {
  selectedIds: string[]
  searchQuery: string
  filterType: FilterType
}

type BuilderAction =
  | { type: "ADD_ITEM"; payload: string }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "REORDER"; payload: string[] }
  | { type: "CLEAR_ALL" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_FILTER"; payload: FilterType }
  | { type: "SYNC_IDS"; payload: string[] }

// ── Reducer ─────────────────────────────────────────────────────
function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  switch (action.type) {
    case "ADD_ITEM":
      if (state.selectedIds.includes(action.payload)) {
        return state
      }
      return {
        ...state,
        selectedIds: [...state.selectedIds, action.payload],
      }
    case "REMOVE_ITEM":
      return {
        ...state,
        selectedIds: state.selectedIds.filter((id) => id !== action.payload),
      }
    case "REORDER":
      return { ...state, selectedIds: action.payload }
    case "CLEAR_ALL":
      return { ...state, selectedIds: [] }
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload }
    case "SET_FILTER":
      return { ...state, filterType: action.payload }
    case "SYNC_IDS":
      return { ...state, selectedIds: action.payload }
    default:
      return state
  }
}

// ── Utility — detect "type" of a resource by its file extension ─
function inferContentType(
  item: ContentItem
): "video" | "pdf" | "quiz" | "other" {
  // Tutorial items → always video
  if ("description" in item && "discountBundle" in item) {
    return "video"
  }

  // Resource items → check _count.resourceMeta extension heuristic
  const resourceItem = item as ResourceQueryItem
  const title = resourceItem.title.toLowerCase()
  if (
    title.includes("quiz") ||
    title.includes("test") ||
    title.includes("exam")
  ) {
    return "quiz"
  }
  if (title.includes("video") || title.includes("lecture")) {
    return "video"
  }
  return "pdf"
}

// ── Hook ────────────────────────────────────────────────────────
interface UseCollectionBuilderOptions {
  availableItems: ContentItem[]
  initialSelectedIds?: string[]
}

export function useCollectionBuilder({
  availableItems,
  initialSelectedIds = [],
}: UseCollectionBuilderOptions) {
  const [state, dispatch] = useReducer(builderReducer, {
    selectedIds: initialSelectedIds,
    searchQuery: "",
    filterType: "all",
  })

  // ── Actions ─────────────────────────────────────────────────
  const addItem = useCallback(
    (id: string) => dispatch({ type: "ADD_ITEM", payload: id }),
    []
  )

  const removeItem = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ITEM", payload: id }),
    []
  )

  const reorderItems = useCallback(
    (newOrder: string[]) => dispatch({ type: "REORDER", payload: newOrder }),
    []
  )

  const clearAll = useCallback(() => dispatch({ type: "CLEAR_ALL" }), [])

  const setSearch = useCallback(
    (q: string) => dispatch({ type: "SET_SEARCH", payload: q }),
    []
  )

  const setFilter = useCallback(
    (f: FilterType) => dispatch({ type: "SET_FILTER", payload: f }),
    []
  )

  const syncIds = useCallback(
    (ids: string[]) => dispatch({ type: "SYNC_IDS", payload: ids }),
    []
  )

  // ── Derived State ───────────────────────────────────────────
  const filteredAvailableItems = useMemo(() => {
    let items = availableItems

    // Apply search filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase()
      items = items.filter((item) => item.title.toLowerCase().includes(q))
    }

    // Apply type filter
    if (state.filterType !== "all") {
      items = items.filter(
        (item) => inferContentType(item) === state.filterType
      )
    }

    return items
  }, [availableItems, state.searchQuery, state.filterType])

  const selectedItems = useMemo(() => {
    return state.selectedIds
      .map((id) => availableItems.find((item) => item.id === id))
      .filter((item): item is ContentItem => item !== undefined)
  }, [state.selectedIds, availableItems])

  const totalCount = state.selectedIds.length

  const totalFileCount = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const count = item._count
      if ("resourceMeta" in count) {
        return acc + (count as ResourceQueryItem["_count"]).resourceMeta
      }
      return acc + 1
    }, 0)
  }, [selectedItems])

  return {
    // State
    selectedIds: state.selectedIds,
    searchQuery: state.searchQuery,
    filterType: state.filterType,

    // Derived
    filteredAvailableItems,
    selectedItems,
    totalCount,
    totalFileCount,

    // Actions
    addItem,
    removeItem,
    reorderItems,
    clearAll,
    setSearch,
    setFilter,
    syncIds,

    // Utility
    isSelected: (id: string) => state.selectedIds.includes(id),
    inferContentType,
  }
}
