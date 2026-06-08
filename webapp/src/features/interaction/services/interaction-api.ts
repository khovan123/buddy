import { baseApi } from "@/lib/redux/base-api"
import type { ApiResponse } from "@/types/api"

export type InteractionContentType =
  | "RESOURCE"
  | "TUTORIAL"
  | "RESOURCE_COLLECTION"
  | "TUTORIAL_COLLECTION"

export type InteractionAction =
  | "VIEW_PREVIEW"
  | "LIKE"
  | "UNLIKE"
  | "COMMENT"
  | "RATING"
  | "DOWNLOAD"
  | "PURCHASE"

export type InteractionStats = {
  itemId: string
  itemType: InteractionContentType
  viewCount: number
  likeCount: number
  purchaseCount: number
  commentCount: number
  downloadCount: number
  ratingCount: number
  ratingAverage: number
  likedByCurrentUser?: boolean
}

type TrackInteractionRequest = {
  itemId: string
  itemType: InteractionContentType
  action: InteractionAction
  ratingValue?: number
  commentId?: string
  majorId?: string
  courseId?: string
  semester?: number
}

export const interactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    trackInteraction: builder.mutation<
      { status: string },
      TrackInteractionRequest
    >({
      query: (body) => ({
        url: "/v1/interactions",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Interaction", id: `${arg.itemType}:${arg.itemId}` },
      ],
    }),
    getInteractionStats: builder.query<
      ApiResponse<InteractionStats[]>,
      Array<{ itemId: string; itemType: InteractionContentType }>
    >({
      query: (items) => ({
        url: "/v1/interactions/stats",
        method: "GET",
        params: {
          items: items
            .map((item) => `${item.itemType}:${item.itemId}`)
            .join(","),
        },
      }),
      providesTags: (result, error, arg) =>
        arg.map((item) => ({
          type: "Interaction" as const,
          id: `${item.itemType}:${item.itemId}`,
        })),
    }),
  }),
})

export const {
  useGetInteractionStatsQuery,
  useTrackInteractionMutation,
} = interactionApi
