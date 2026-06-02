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
  }
  status: string
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
  }),
})

export const { useGetNotificationsQuery } = notificationApi
