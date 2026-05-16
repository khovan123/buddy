// "use client"

// import {
//   createContext,
//   type PropsWithChildren,
//   useContext,
//   useEffect,
//   useState,
// } from "react"

// import { socketService } from "./socket-service"

// interface SocketContextValue {
//   isConnected: boolean
// }

// const SocketContext = createContext<SocketContextValue>({
//   isConnected: false,
// })

// export function SocketProvider({ children }: PropsWithChildren) {
//   const [isConnected, setIsConnected] = useState(
//     () => socketService.instance?.connected ?? false
//   )

//   useEffect(() => {
//     const socket = socketService.connect()

//     const onConnect = () => setIsConnected(true)
//     const onDisconnect = () => setIsConnected(false)

//     socket.on("connect", onConnect)
//     socket.on("disconnect", onDisconnect)

//     return () => {
//       socket.off("connect", onConnect)
//       socket.off("disconnect", onDisconnect)
//       socketService.disconnect()
//     }
//   }, [])

//   return (
//     <SocketContext.Provider value={{ isConnected }}>
//       {children}
//     </SocketContext.Provider>
//   )
// }

// export function useSocket() {
//   return useContext(SocketContext)
// }
