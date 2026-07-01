import { createTranslator } from "@/i18n/dictionary"
import { getServerLocale } from "@/i18n/server"

type SeoContent = {
  title: string
  description: string
  badge: string
}

const SEO_FALLBACK: Record<"en" | "vi", Record<string, SeoContent>> = {
  en: {
    explore: {
      title: "Explore featured learning content",
      description:
        "Discover standout collections, resources, and tutorials on Buddy. Find curated learning content for students and educators.",
      badge: "Explore",
    },
    "explore-resources": {
      title: "Explore resources",
      description:
        "Browse study resources including notes, guides, and learning materials. Supports docx, pdf, pptx, and md formats.",
      badge: "Resources",
    },
    "explore-resources-collections": {
      title: "Resource collections",
      description:
        "Discover curated resource collections with valuable study materials for your learning journey.",
      badge: "Resource collections",
    },
    "explore-tutorials": {
      title: "Explore tutorials",
      description:
        "Access tutorials with guided videos and attached resources. Build skills with expert-led content.",
      badge: "Tutorials",
    },
    "explore-tutorials-collections": {
      title: "Tutorial collections",
      description:
        "Discover tutorial collections with video lessons and supporting resources for deeper learning.",
      badge: "Tutorial collections",
    },
    library: {
      title: "My library",
      description:
        "Access all purchased resources, tutorials, and collections. Content remains available even if the owner removes the original.",
      badge: "Library",
    },
  },
  vi: {
    explore: {
      title: "Khám phá bộ sưu tập nổi bật",
      description:
        "Khám phá các bộ sưu tập, tài liệu và bài học đang nổi bật trên Buddy. Tìm nội dung học tập được chọn lọc cho người học và nhà giáo dục.",
      badge: "Khám phá",
    },
  "explore-resources": {
    title: "Khám phá tài liệu",
    description:
      "Tìm nhiều tài liệu học tập như ghi chú, hướng dẫn và học liệu. Hỗ trợ các định dạng docx, pdf, pptx và md.",
    badge: "Tài liệu",
  },
  "explore-resources-collections": {
    title: "Bộ sưu tập tài liệu",
    description:
      "Khám phá các bộ sưu tập tài liệu được chọn lọc, mang đến nhiều học liệu giá trị cho hành trình học tập của bạn.",
    badge: "Bộ sưu tập tài liệu",
  },
  "explore-tutorials": {
    title: "Khám phá bài học",
    description:
      "Truy cập nhiều bài học với video hướng dẫn và tài liệu đính kèm. Nâng cao kỹ năng với nội dung do chuyên gia dẫn dắt.",
    badge: "Bài học",
  },
  "explore-tutorials-collections": {
    title: "Bộ sưu tập bài học",
    description:
      "Khám phá các bộ sưu tập bài học gồm nhiều video và tài nguyên hỗ trợ để bạn học tập toàn diện hơn.",
    badge: "Bộ sưu tập bài học",
  },
  "explore-resources-collection-:id": {
    title: "Chi tiết bộ sưu tập tài liệu",
    description:
      "Xem thông tin chi tiết, giá và các tài liệu có trong bộ sưu tập này. Tài liệu hỗ trợ docx, pdf, pptx và md.",
    badge: "Bộ sưu tập tài liệu",
  },
  "explore-resources-:id": {
    title: "Chi tiết tài liệu",
    description:
      "Xem giá, nội dung và các tệp có trong tài liệu này. Tải xuống theo định dạng docx, pdf, pptx hoặc md.",
    badge: "Tài liệu",
  },
  "explore-tutorials-collection-:id": {
    title: "Chi tiết bộ sưu tập bài học",
    description:
      "Xem chi tiết bộ sưu tập bài học này: giá, nội dung, video của từng bài học và các tài nguyên đính kèm.",
    badge: "Bộ sưu tập bài học",
  },
  "explore-tutorials-:id": {
    title: "Chi tiết bài học",
    description:
      "Xem chi tiết bài học: giá, nội dung, video hướng dẫn và các tài nguyên đính kèm có thể tải về.",
    badge: "Bài học",
  },
  library: {
    title: "Thư viện của tôi",
    description:
      "Truy cập toàn bộ tài liệu, bài học và bộ sưu tập bạn đã mua. Nội dung vẫn khả dụng kể cả khi chủ sở hữu xóa bản gốc.",
    badge: "Thư viện",
  },
  "library-resources-:id": {
    title: "Chi tiết tài liệu | Thư viện của tôi",
    description:
      "Xem và tải tài liệu trực tiếp trên web. Hỗ trợ docx, pdf, pptx và md.",
    badge: "Tài liệu",
  },
  "library-resources-collections-:id": {
    title: "Chi tiết bộ sưu tập tài liệu | Thư viện của tôi",
    description:
      "Duyệt bộ sưu tập tài liệu bạn đã mua dưới dạng danh sách. Xem và tải từng tài liệu dễ dàng.",
    badge: "Bộ sưu tập tài liệu",
  },
  "library-tutorials-:id": {
    title: "Chi tiết bài học | Thư viện của tôi",
    description:
      "Xem video bài học bạn đã mua và truy cập toàn bộ tài nguyên đính kèm. Có thể xem hoặc tải tài liệu hỗ trợ trực tiếp.",
    badge: "Bài học",
  },
  "library-tutorials-collections-:id": {
    title: "Chi tiết bộ sưu tập bài học | Thư viện của tôi",
    description:
      "Duyệt bộ sưu tập bài học bạn đã mua, xem video và truy cập tài nguyên đính kèm của từng bài học.",
    badge: "Bộ sưu tập bài học",
  },
  home: {
    title: "Nền tảng học tập Buddy",
    description:
      "Khám phá, mua bán tài liệu học tập, khóa học và kết nối với chuyên gia giáo dục trên Buddy.",
    badge: "Nền tảng học tập",
  },
  about: {
    title: "Về Buddy",
    description:
      "Tìm hiểu về Buddy - nền tảng học tập do cộng đồng dẫn dắt, kết nối người học với tài liệu, bài học và bộ sưu tập chất lượng.",
    badge: "Giới thiệu",
  },
  contact: {
    title: "Liên hệ",
    description:
      "Liên hệ với đội ngũ Buddy để được hỗ trợ tài khoản, tư vấn sản phẩm hoặc giải đáp các câu hỏi của bạn.",
    badge: "Liên hệ",
  },
  pricing: {
    title: "Bảng giá",
    description:
      "So sánh các gói của Buddy cho creator và người học. Mở rộng dung lượng, tăng giới hạn nội dung và nhận hỗ trợ tốt hơn.",
    badge: "Bảng giá",
  },
  faq: {
    title: "Câu hỏi thường gặp",
    description:
      "Giải đáp các câu hỏi thường gặp về nền tảng Buddy, công cụ creator, đăng ký và tài nguyên học tập.",
    badge: "FAQ",
  },
  "how-it-works": {
    title: "Cách Buddy hoạt động",
    description:
      "Tìm hiểu cách sử dụng Buddy từ đăng ký, khám phá tài liệu, mua bài học đến xây dựng hồ sơ creator của bạn.",
    badge: "Hướng dẫn",
  },
  "auth-sign-up": {
    title: "Đăng ký tài khoản",
    description:
      "Tạo tài khoản để bắt đầu mua, bán tài liệu, khóa học và tham gia cộng đồng học tập năng động.",
    badge: "Đăng ký",
  },
  "auth-login": {
    title: "Đăng nhập Buddy",
    description:
      "Truy cập thư viện, khóa học và quản lý các giao dịch học tập của bạn.",
    badge: "Đăng nhập",
  },
  "auth-otp": {
    title: "Xác thực OTP",
    description:
      "Nhập mã OTP để bảo vệ tài khoản và tiếp tục sử dụng Buddy an toàn.",
    badge: "Bảo mật",
  },
  "auth-forgot-password": {
    title: "Đặt lại mật khẩu",
    description:
      "Yêu cầu liên kết đặt lại mật khẩu để khôi phục quyền truy cập vào tài khoản Buddy.",
    badge: "Bảo mật",
  },
  "auth-reset-password": {
    title: "Tạo mật khẩu mới",
    description: "Chọn mật khẩu mới an toàn cho tài khoản Buddy của bạn.",
    badge: "Bảo mật",
  },
  onboarding: {
    title: "Hoàn thiện hồ sơ",
    description:
      "Giúp Buddy cá nhân hóa trải nghiệm của bạn bằng cách cập nhật chuyên ngành, định hướng nghề nghiệp và kỹ năng nổi bật.",
    badge: "Onboarding",
  },
  profile: {
    title: "Hồ sơ cá nhân",
    description:
      "Quản lý thông tin cá nhân, nội dung đã đăng, giao dịch và lịch sử học tập của bạn trên Buddy.",
    badge: "Hồ sơ",
  },
  dashboard: {
    title: "Bảng điều khiển",
    description: "Quản lý metadata như chuyên ngành, môn học và cấu hình hệ thống.",
    badge: "Quản trị",
  },
  "create-resource": {
    title: "Tạo tài liệu",
    description:
      "Tải lên tài liệu học tập và gắn với môn học. Hỗ trợ docx, pdf, pptx và md.",
    badge: "Tạo mới",
  },
  "create-tutorial": {
    title: "Tạo bài học",
    description:
      "Tạo bài học mới với video hướng dẫn và tài nguyên hỗ trợ cho người học.",
    badge: "Tạo mới",
  },
  "create-collection": {
    title: "Tạo bộ sưu tập",
    description:
      "Gom tài liệu và bài học thành một lộ trình học tập thống nhất, có thể kèm giảm giá.",
    badge: "Tạo mới",
  },
  },
}

export async function getSeoContent(slug: string): Promise<SeoContent> {
  const locale = await getServerLocale()
  const t = createTranslator(locale)
  const fallback = SEO_FALLBACK[locale][slug] ?? SEO_FALLBACK.vi[slug] ?? {
    title: `Buddy | ${slug}`,
    description: t("seo.defaultDescription"),
    badge: t("nav.explore"),
  }

  return fallback
}

export type { SeoContent }
