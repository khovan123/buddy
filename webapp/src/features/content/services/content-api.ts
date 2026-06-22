import { revalidateCacheTag } from "@/app/actions/revalidate"
import { baseApi } from "@/lib/redux/base-api"

import type {
  ApiResponse,
  CollectionQueryItem,
  Course,
  CreateCollectionPayload,
  CreateCoursePayload,
  CreateMajorPayload,
  CreateResourcePayload,
  CreateResourceResponse,
  CreateTutorialPayload,
  CreateTutorialResponse,
  Major,
  PaginatedResult,
  ResourceQueryItem,
  TutorialQueryItem,
  UpdateCoursePayload,
  UpdateCollectionPayload,
  UpdateMajorPayload,
  UpdateResourcePayload,
  UpdateTutorialPayload,
  UploadHistoryItem,
} from "../types"

// ─────────────────────────────────────────────────────────────
// Redux RTK Query Client (Dành cho Client Components - Form Tạo Mới)
// ─────────────────────────────────────────────────────────────

/** Content metadata response from GET /v1/content-meta */
interface ContentMetaResponse {
  majors: Major[]
  courses: Course[]
}

export const contentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createTutorial: builder.mutation<
      ApiResponse<CreateTutorialResponse>,
      CreateTutorialPayload
    >({
      query: (body) => ({
        url: "/v1/tutorials",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tutorial"],
    }),
    createCollection: builder.mutation<
      ApiResponse<unknown>,
      CreateCollectionPayload
    >({
      query: (body) => ({
        url: "/v1/collections",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Collection"],
    }),
    getCollectionById: builder.query<ApiResponse<CollectionQueryItem>, string>({
      query: (collectionId) => ({
        url: `/v1/collections/${collectionId}`,
        method: "GET",
      }),
      providesTags: (result, error, arg) => [{ type: "Collection", id: arg }],
    }),
    updateCollection: builder.mutation<
      ApiResponse<{ success: boolean }>,
      { id: string; body: UpdateCollectionPayload }
    >({
      query: ({ id, body }) => ({
        url: `/v1/collections/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        "Collection",
        { type: "Collection", id: arg.id },
      ],
    }),
    createResource: builder.mutation<
      ApiResponse<CreateResourceResponse>,
      CreateResourcePayload
    >({
      query: (body) => ({
        url: "/v1/resources",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Resource"],
    }),
    getResourceById: builder.query<ApiResponse<ResourceQueryItem>, string>({
      query: (resourceId) => ({
        url: `/v1/resources/${resourceId}`,
        method: "GET",
      }),
      providesTags: (result, error, arg) => [{ type: "Resource", id: arg }],
    }),
    updateResource: builder.mutation<
      ApiResponse<{ success: boolean }>,
      { id: string; body: UpdateResourcePayload }
    >({
      query: ({ id, body }) => ({
        url: `/v1/resources/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        "Resource",
        { type: "Resource", id: arg.id },
      ],
    }),
    confirmResourceUpload: builder.mutation<
      ApiResponse<{ message: string; resourceId: string; fileCount: number }>,
      { resourceId: string; fileIds: string[] }
    >({
      query: (body) => ({
        url: "/v1/uploads/resource/confirm",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Resource"],
    }),
    confirmTutorialUpload: builder.mutation<
      ApiResponse<{ message: string; id?: string }>,
      { fileId: string; s3Key: string }
    >({
      query: (body) => ({
        url: "/v1/uploads/tutorial/confirm",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tutorial"],
    }),

    // Content metadata — majors + courses for form selectors
    getContentMeta: builder.query<ApiResponse<ContentMetaResponse>, void>({
      query: () => ({
        url: "/v1/content-meta",
        method: "GET",
      }),
      providesTags: ["Major", "Course"],
    }),
    getMyResources: builder.query<
      ApiResponse<PaginatedResult<ResourceQueryItem>>,
      void
    >({
      query: () => ({
        url: "/v1/resources/me?page=1&limit=20",
        method: "GET",
      }),
      providesTags: ["Resource"],
    }),
    getMyTutorials: builder.query<
      ApiResponse<PaginatedResult<TutorialQueryItem>>,
      void
    >({
      query: () => ({
        url: "/v1/tutorials/me?page=1&limit=20",
        method: "GET",
      }),
      providesTags: ["Tutorial"],
    }),
    getTutorialById: builder.query<ApiResponse<TutorialQueryItem>, string>({
      query: (tutorialId) => ({
        url: `/v1/tutorials/${tutorialId}`,
        method: "GET",
      }),
      providesTags: (result, error, arg) => [{ type: "Tutorial", id: arg }],
    }),
    updateTutorial: builder.mutation<
      ApiResponse<{ success: boolean }>,
      { id: string; body: UpdateTutorialPayload }
    >({
      query: ({ id, body }) => ({
        url: `/v1/tutorials/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        "Tutorial",
        { type: "Tutorial", id: arg.id },
      ],
    }),
    getCoursesByMajor: builder.query<ApiResponse<Course[]>, string>({
      query: (majorId) => ({
        url: `/v1/content-meta/courses?majorId=${majorId}`,
        method: "GET",
      }),
      providesTags: ["Course"],
    }),

    // --- MAJOR ADMIN MUTATIONS ---
    createMajor: builder.mutation<ApiResponse<Major>, CreateMajorPayload>({
      query: (body) => ({
        url: "/v1/content-meta/majors",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Major"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),
    updateMajor: builder.mutation<
      ApiResponse<Major>,
      { id: string; body: UpdateMajorPayload }
    >({
      query: ({ id, body }) => ({
        url: `/v1/content-meta/majors/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Major"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),
    deleteMajor: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/v1/content-meta/majors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Major"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    // --- COURSE ADMIN MUTATIONS ---
    createCourse: builder.mutation<ApiResponse<Course>, CreateCoursePayload>({
      query: (body) => ({
        url: "/v1/content-meta/courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Course"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),
    updateCourse: builder.mutation<
      ApiResponse<Course>,
      { id: string; body: UpdateCoursePayload }
    >({
      query: ({ id, body }) => ({
        url: `/v1/content-meta/courses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Course"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),
    deleteCourse: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/v1/content-meta/courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Course"],
      async onQueryStarted(arg, { queryFulfilled }) {
        await queryFulfilled
        revalidateCacheTag("profile-me")
      },
    }),

    // --- UPLOAD HISTORY ---
    getResourceUploadHistoryById: builder.query<
      ApiResponse<UploadHistoryItem[]>,
      string
    >({
      query: (resourceId) => ({
        url: `/v1/resources/${resourceId}/upload-history`,
        method: "GET",
      }),
      providesTags: (result, error, arg) => [{ type: "Resource", id: arg }],
    }),
    getTutorialUploadHistoryById: builder.query<
      ApiResponse<UploadHistoryItem[]>,
      string
    >({
      query: (tutorialId) => ({
        url: `/v1/tutorials/${tutorialId}/upload-history`,
        method: "GET",
      }),
      providesTags: (result, error, arg) => [{ type: "Tutorial", id: arg }],
    }),
    recheckResourceModeration: builder.mutation<
      ApiResponse<unknown>,
      { resourceId: string }
    >({
      query: ({ resourceId }) => ({
        url: `/v1/resources/${resourceId}/moderation/recheck`,
        method: "POST",
      }),
      invalidatesTags: (result, error, arg) => [
        "Resource",
        { type: "Resource", id: arg.resourceId },
      ],
    }),
    deleteResource: builder.mutation<ApiResponse<{ success: boolean }>, string>(
      {
        query: (resourceId) => ({
          url: `/v1/resources/${resourceId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Resource"],
        async onQueryStarted(resourceId, { dispatch, queryFulfilled }) {
          const patch = dispatch(
            contentApi.util.updateQueryData(
              "getMyResources",
              undefined,
              (draft) => {
                const beforeCount = draft.data.data.length
                draft.data.data = draft.data.data.filter(
                  (resource) => resource.id !== resourceId
                )

                if (draft.data.data.length !== beforeCount) {
                  draft.data.meta.total = Math.max(0, draft.data.meta.total - 1)
                }
              }
            )
          )

          try {
            await queryFulfilled
          } catch {
            patch.undo()
          }
        },
      }
    ),
    recheckTutorialModeration: builder.mutation<
      ApiResponse<unknown>,
      { tutorialId: string }
    >({
      query: ({ tutorialId }) => ({
        url: `/v1/tutorials/${tutorialId}/moderation/recheck`,
        method: "POST",
      }),
      invalidatesTags: (result, error, arg) => [
        "Tutorial",
        { type: "Tutorial", id: arg.tutorialId },
      ],
    }),
    deleteTutorial: builder.mutation<ApiResponse<{ success: boolean }>, string>(
      {
        query: (tutorialId) => ({
          url: `/v1/tutorials/${tutorialId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Tutorial"],
        async onQueryStarted(tutorialId, { dispatch, queryFulfilled }) {
          const patch = dispatch(
            contentApi.util.updateQueryData(
              "getMyTutorials",
              undefined,
              (draft) => {
                const beforeCount = draft.data.data.length
                draft.data.data = draft.data.data.filter(
                  (tutorial) => tutorial.id !== tutorialId
                )

                if (draft.data.data.length !== beforeCount) {
                  draft.data.meta.total = Math.max(0, draft.data.meta.total - 1)
                }
              }
            )
          )

          try {
            await queryFulfilled
          } catch {
            patch.undo()
          }
        },
      }
    ),
  }),
})

export const {
  useCreateTutorialMutation,
  useCreateCollectionMutation,
  useGetCollectionByIdQuery,
  useUpdateCollectionMutation,
  useCreateResourceMutation,
  useGetResourceByIdQuery,
  useUpdateResourceMutation,
  useConfirmResourceUploadMutation,
  useConfirmTutorialUploadMutation,
  useGetContentMetaQuery,
  useGetMyResourcesQuery,
  useGetMyTutorialsQuery,
  useGetTutorialByIdQuery,
  useUpdateTutorialMutation,
  useGetCoursesByMajorQuery,
  useCreateMajorMutation,
  useUpdateMajorMutation,
  useDeleteMajorMutation,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetResourceUploadHistoryByIdQuery,
  useGetTutorialUploadHistoryByIdQuery,
  useRecheckResourceModerationMutation,
  useRecheckTutorialModerationMutation,
  useDeleteResourceMutation,
  useDeleteTutorialMutation,
} = contentApi
