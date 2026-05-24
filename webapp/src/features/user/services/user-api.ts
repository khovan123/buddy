import { revalidateCacheTag } from "@/app/actions/revalidate"
import type { ApiResponse, PaginatedResult } from "@/types/api"
import type { CareerItem, SkillItem } from "@/types/shared"

import { baseApi } from "../../../lib/redux/base-api"

export type { CareerItem, SkillItem }

export interface UserProfile {
  id: string
  userId?: string
  email: string
  nickname: string
  profile: {
    nickname: string
    phone?: string
    bio?: string
    dateOfBirth?: string
    avatarUrl?: string
    majorId?: string
    courseId?: string
    semester?: number
    careerId?: string
    skillIds?: string[]
    career?: { id: string; name: string }
    skills?: { id: string; name: string }[]
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateMe: build.mutation<
      ApiResponse<UserProfile>,
      Partial<{
        nickname: string
        phone: string
        bio: string
        majorId: string
        courseId: string
        semester: number
        careerId: string
        skillIds: string[]
      }>
    >({
      query: (body) => ({
        url: "/v1/users/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["UserProfile"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    getCareers: build.query<
      ApiResponse<PaginatedResult<CareerItem>>,
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams()
        if (params?.page) {
          qs.set("page", String(params.page))
        }
        if (params?.limit) {
          qs.set("limit", String(params.limit))
        }
        if (params?.search) {
          qs.set("search", params.search)
        }
        const query = qs.toString()
        return {
          url: `/v1/profile-metadata/careers${query ? `?${query}` : ""}`,
        }
      },
      providesTags: ["Career"],
    }),

    createCareer: build.mutation<ApiResponse<CareerItem>, Partial<CareerItem>>({
      query: (body) => ({
        url: "/v1/profile-metadata/careers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Career"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    updateCareer: build.mutation<
      ApiResponse<CareerItem>,
      { id: string; body: Partial<CareerItem> }
    >({
      query: ({ id, body }) => ({
        url: `/v1/profile-metadata/careers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Career"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    deleteCareer: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/v1/profile-metadata/careers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Career"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    getSkills: build.query<
      ApiResponse<PaginatedResult<SkillItem>>,
      { page?: number; limit?: number; careerId?: string } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams()
        if (params?.page) {
          qs.set("page", String(params.page))
        }
        if (params?.limit) {
          qs.set("limit", String(params.limit))
        }
        if (params?.careerId) {
          qs.set("careerId", params.careerId)
        }
        const query = qs.toString()
        return { url: `/v1/profile-metadata/skills${query ? `?${query}` : ""}` }
      },
      providesTags: ["Skill"],
    }),

    createSkill: build.mutation<ApiResponse<SkillItem>, Partial<SkillItem>>({
      query: (body) => ({
        url: "/v1/profile-metadata/skills",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Skill"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    updateSkill: build.mutation<
      ApiResponse<SkillItem>,
      { id: string; body: Partial<SkillItem> }
    >({
      query: ({ id, body }) => ({
        url: `/v1/profile-metadata/skills/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Skill"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    deleteSkill: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/v1/profile-metadata/skills/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Skill"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),
  }),
})

export const {
  useUpdateMeMutation,
  useGetCareersQuery,
  useCreateCareerMutation,
  useUpdateCareerMutation,
  useDeleteCareerMutation,
  useGetSkillsQuery,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
  useLazyGetSkillsQuery,
} = userApi
