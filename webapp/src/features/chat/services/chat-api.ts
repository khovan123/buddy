import { baseApi } from "@/lib/redux/base-api"
import { socketService } from "@/lib/socket/socket-service"

export interface ChatMessage {
  id: string
  content: string
  senderId?: string
  createdAt?: string
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<ChatMessage[], void>({
      query: () => "/chat/messages",
      async onCacheEntryAdded(
        _arg,
        { cacheDataLoaded, cacheEntryRemoved, updateCachedData }
      ) {
        const handleNewMessage = (newMessage: ChatMessage) => {
          updateCachedData((draft) => {
            draft.push(newMessage)
          })
        }

        try {
          await cacheDataLoaded

          socketService.on<ChatMessage>("new-message", handleNewMessage)
        } catch {
          return
        }

        await cacheEntryRemoved
        socketService.off<ChatMessage>("new-message", handleNewMessage)
      },
    }),
  }),
  overrideExisting: false,
})

export const { useGetMessagesQuery } = chatApi
