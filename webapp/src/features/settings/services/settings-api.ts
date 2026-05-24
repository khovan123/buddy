import { baseApi } from "@/lib/redux/base-api"
import type { ApiResponse } from "@/types/api"

export type NotificationPreferences = {
  productUpdates: boolean
  learningReminders: boolean
  walletEvents: boolean
  creatorSales: boolean
  weeklyDigest: boolean
  updatedAt?: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  productUpdates: true,
  learningReminders: true,
  walletEvents: true,
  creatorSales: true,
  weeklyDigest: false,
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotificationPreferences: build.query<
      ApiResponse<NotificationPreferences>,
      void
    >({
      query: () => ({
        url: "/v1/notifications/preferences",
        method: "GET",
      }),
      providesTags: ["NotificationPreferences"],
    }),

    updateNotificationPreferences: build.mutation<
      ApiResponse<NotificationPreferences>,
      Partial<NotificationPreferences>
    >({
      query: (body) => ({
        url: "/v1/notifications/preferences",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["NotificationPreferences"],
    }),
  }),
})

export const {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = settingsApi
