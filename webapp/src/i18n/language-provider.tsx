"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const SUPPORTED_LOCALES = ["en", "vi"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

type TranslationKey =
  | "common.language"
  | "common.english"
  | "common.vietnamese"
  | "common.done"
  | "common.nextStep"
  | "common.notNow"
  | "common.email"
  | "common.password"
  | "common.loadingLogin"
  | "common.login"
  | "nav.home"
  | "nav.explore"
  | "nav.resource"
  | "nav.resourceDescription"
  | "nav.tutorial"
  | "nav.tutorialDescription"
  | "nav.forum"
  | "nav.library"
  | "nav.profile"
  | "nav.content"
  | "nav.dashboard"
  | "user.menu"
  | "user.myProfile"
  | "user.editProfile"
  | "user.settings"
  | "user.signOut"
  | "user.signOutTitle"
  | "user.signOutDescription"
  | "session.expiredTitle"
  | "session.expiredDescription"
  | "session.loginAgain"
  | "session.loginTitle"
  | "session.loginDescription"
  | "content.title"
  | "content.description"
  | "content.newResource"
  | "content.resources"
  | "content.tutorials"
  | "content.collections"
  | "content.checklist.resource"
  | "content.checklist.collection"
  | "content.checklist.review"
  | "createContent.title"
  | "createContent.description"
  | "createContent.resource"
  | "createContent.resourceDescription"
  | "createContent.tutorial"
  | "createContent.tutorialDescription"
  | "createContent.collection"
  | "createContent.collectionDescription"
  | "createContent.comingSoon"

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "common.language": "Language",
    "common.english": "English",
    "common.vietnamese": "Tiếng Việt",
    "common.done": "Done",
    "common.nextStep": "Next step",
    "common.notNow": "Not now",
    "common.email": "Email",
    "common.password": "Password",
    "common.loadingLogin": "Logging in...",
    "common.login": "Log in",
    "nav.home": "Home",
    "nav.explore": "Explore",
    "nav.resource": "Resource",
    "nav.resourceDescription": "Browse study materials, notes, and documents",
    "nav.tutorial": "Tutorial",
    "nav.tutorialDescription": "Browse guided videos and learning sessions",
    "nav.forum": "Forum",
    "nav.library": "Library",
    "nav.profile": "Profile",
    "nav.content": "Content",
    "nav.dashboard": "Dashboard",
    "user.menu": "User menu",
    "user.myProfile": "My Profile",
    "user.editProfile": "Edit Profile",
    "user.settings": "Settings",
    "user.signOut": "Sign out",
    "user.signOutTitle": "Sign out?",
    "user.signOutDescription":
      "You will need to log in again before managing your content, billing, and account settings.",
    "session.expiredTitle": "Session expired",
    "session.expiredDescription": "Log in again to continue from this page.",
    "session.loginAgain": "Log in again",
    "session.loginTitle": "Log in to continue",
    "session.loginDescription":
      "Your session expired. Use the same account method again to continue from this page.",
    "content.title": "My content",
    "content.description":
      "Create, organize, and check everything you share with learners.",
    "content.newResource": "New resource",
    "content.resources": "Resources",
    "content.tutorials": "Tutorials",
    "content.collections": "Collections",
    "content.checklist.resource": "Create your first resource",
    "content.checklist.collection": "Create a collection",
    "content.checklist.review": "Review preview and status",
    "createContent.title": "What do you want to create?",
    "createContent.description":
      "Pick the format that fits what you want to share.",
    "createContent.resource": "Resource",
    "createContent.resourceDescription": "Upload PDFs, notes, or documents.",
    "createContent.tutorial": "Tutorial",
    "createContent.tutorialDescription":
      "Share a guided video lesson with learners.",
    "createContent.collection": "Collection",
    "createContent.collectionDescription":
      "Group resources or tutorials into a learning path.",
    "createContent.comingSoon": "More formats are coming soon.",
  },
  vi: {
    "common.language": "Ngôn ngữ",
    "common.english": "English",
    "common.vietnamese": "Tiếng Việt",
    "common.done": "Xong",
    "common.nextStep": "Bước tiếp theo",
    "common.notNow": "Để sau",
    "common.email": "Email",
    "common.password": "Mật khẩu",
    "common.loadingLogin": "Đang đăng nhập...",
    "common.login": "Đăng nhập",
    "nav.home": "Trang chủ",
    "nav.explore": "Khám phá",
    "nav.resource": "Tài liệu",
    "nav.resourceDescription": "Xem tài liệu học, ghi chú và file ôn tập",
    "nav.tutorial": "Bài học",
    "nav.tutorialDescription": "Xem video hướng dẫn và bài học theo lộ trình",
    "nav.forum": "Diễn đàn",
    "nav.library": "Thư viện",
    "nav.profile": "Hồ sơ",
    "nav.content": "Nội dung",
    "nav.dashboard": "Quản trị",
    "user.menu": "Menu tài khoản",
    "user.myProfile": "Hồ sơ của tôi",
    "user.editProfile": "Sửa hồ sơ",
    "user.settings": "Cài đặt",
    "user.signOut": "Đăng xuất",
    "user.signOutTitle": "Đăng xuất?",
    "user.signOutDescription":
      "Bạn cần đăng nhập lại trước khi quản lý nội dung, thanh toán và cài đặt tài khoản.",
    "session.expiredTitle": "Phiên đăng nhập đã hết hạn",
    "session.expiredDescription": "Đăng nhập lại để tiếp tục ở trang hiện tại.",
    "session.loginAgain": "Đăng nhập lại",
    "session.loginTitle": "Đăng nhập để tiếp tục",
    "session.loginDescription":
      "Phiên đăng nhập đã hết hạn. Hãy dùng lại cách đăng nhập cũ để tiếp tục.",
    "content.title": "Nội dung của tôi",
    "content.description":
      "Tạo, sắp xếp và kiểm tra mọi thứ bạn chia sẻ với người học.",
    "content.newResource": "Tài liệu mới",
    "content.resources": "Tài liệu",
    "content.tutorials": "Bài học",
    "content.collections": "Bộ sưu tập",
    "content.checklist.resource": "Tạo tài liệu đầu tiên",
    "content.checklist.collection": "Tạo một bộ sưu tập",
    "content.checklist.review": "Xem bản xem trước và trạng thái",
    "createContent.title": "Bạn muốn tạo gì?",
    "createContent.description":
      "Chọn định dạng phù hợp với nội dung bạn muốn chia sẻ.",
    "createContent.resource": "Tài liệu",
    "createContent.resourceDescription": "Tải lên PDF, ghi chú hoặc tài liệu.",
    "createContent.tutorial": "Bài học",
    "createContent.tutorialDescription":
      "Chia sẻ một video hướng dẫn cho người học.",
    "createContent.collection": "Bộ sưu tập",
    "createContent.collectionDescription":
      "Gom tài liệu hoặc bài học thành một lộ trình.",
    "createContent.comingSoon": "Sẽ có thêm định dạng khác sau.",
  },
}

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function normalizeLocale(value: string | null | undefined): Locale {
  return value === "vi" ? "vi" : "en"
}

function readInitialLocale() {
  if (typeof document === "undefined") {
    return "en" as Locale
  }

  const cookieLocale = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("buddy_locale="))
    ?.split("=")[1]
  const savedLocale = globalThis.localStorage?.getItem("buddy_locale")

  return normalizeLocale(savedLocale || cookieLocale)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    globalThis.localStorage?.setItem("buddy_locale", nextLocale)
    document.cookie = `buddy_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = nextLocale
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translations[locale][key] ?? translations.en[key],
    }),
    [locale, setLocale]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider")
  }

  return context
}
