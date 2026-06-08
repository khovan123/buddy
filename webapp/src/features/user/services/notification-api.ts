import type { ApiResponse } from "@/types/api"

import { baseApi } from "../../../lib/redux/base-api"

export interface UserNotification {
  _id: string
  type: "email" | "push" | "sms" | "in_app"
  channel: string
  subject?: string
  templateId: string
  templateData: {
    amount?: string
    itemCount?: number
    purchaseId?: string
    contentId?: string
    contentType?: "RESOURCE" | "TUTORIAL"
    title?: string
    slug?: string | null
    decision?: "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "ERROR"
    score?: number | null
    reasons?: string[]
    ruleVersion?: string
    moderatedAt?: string
    actorId?: string
    actorName?: string
    topicId?: string
    topicTitle?: string
    messageId?: string
    excerpt?: string
    href?: string
    createdAt?: string
  }
  status: string
  readAt?: string | null
  createdAt: string
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<ApiResponse<UserNotification[]>, void>({
      query: () => ({
        url: "/v1/notifications",
        method: "GET",
      }),
      providesTags: ["Notification"],
    }),
    markAllNotificationsRead: build.mutation<
      ApiResponse<{ updatedCount: number }>,
      void
    >({
      query: () => ({
        url: "/v1/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
})

export const { useGetNotificationsQuery, useMarkAllNotificationsReadMutation } =
  notificationApi
