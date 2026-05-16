"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

import { usePathname } from "next/navigation"

import { toast } from "sonner"

import { extractApiError } from "@/types/api"

interface ErrorContextType {
  error: string | null
  setError: (msg: string | null) => void
  handleError: (error: unknown, showToast?: boolean) => void
  clearError: () => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<string | null>(null)
  const pathname = usePathname()
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Clear global error on route change (render phase sync)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setErrorState(null)
  }

  const setError = (msg: string | null) => {
    setErrorState(msg)
  }

  const handleError = (err: unknown, showToast = true) => {
    const msg = extractApiError(err)
    setErrorState(msg)
    if (showToast && msg) {
      toast.error(msg)
    }
  }

  const clearError = () => {
    setErrorState(null)
  }

  return (
    <ErrorContext.Provider value={{ error, setError, handleError, clearError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useGlobalError() {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error("useGlobalError must be used within an ErrorProvider")
  }
  return context
}
