import { io, type Socket } from "socket.io-client"

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    const socketUrl = process.env.NEXT_SOCKET_URL

    if (!this.socket) {
      this.socket = io(socketUrl, {
        autoConnect: false,
      })
    }

    this.socket.connect()

    return this.socket
  }

  disconnect() {
    this.socket?.disconnect()
  }

  on<T>(event: string, handler: (payload: T) => void) {
    this.socket?.on(event, handler)
  }

  off<T>(event: string, handler: (payload: T) => void) {
    this.socket?.off(event, handler)
  }

  get instance() {
    return this.socket
  }
}

export const socketService = new SocketService()
