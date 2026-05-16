import type { CollectionCardData } from "@/components/molecules/collection-card"
import {
  LibraryAssetKind,
  type LibraryAsset,
} from "@/features/library/components/library-asset-card"

type CurriculumLesson = {
  id: string
  title: string
  duration: string
  isPreview?: boolean
  videoSource: string
  poster: string
  description: string[]
  resources: TutorialResourceItem[]
  discussion: TutorialDiscussionItem[]
  instructor: TutorialInstructor
}

export type TutorialResourceItem = {
  slug: string
  sourcePath: string
  title: string
  description: string
  author: string
  image: string
  fileType: "pdf" | "docx" | "pptx"
  kind: Exclude<LibraryAssetKind, typeof LibraryAssetKind.Tutorial>
}

const createTutorialFileResources = (
  tutorialId: string
): TutorialResourceItem[] => [
  {
    slug: `${tutorialId}-worksheet-docx`,
    sourcePath: "/library-sources/test_doc.docx",
    title: "Session Worksheet (.docx)",
    description:
      "Structured worksheet to apply this tutorial in your own project.",
    author: "Emma Stone",
    image: "https://miro.medium.com/v2/0*4se8HYDTJbnF_-PC.png",
    fileType: "docx",
    kind: LibraryAssetKind.Components,
  },
  {
    slug: `${tutorialId}-slides-pptx`,
    sourcePath: "/library-sources/test-pptx.pptx",
    title: "Session Slides (.pptx)",
    description: "Presentation deck for walkthrough and team sharing.",
    author: "Emma Stone",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA5htpqjzJbIA9ysc1boQF2Ju-0Rf6kl8N3GU3FtgA2XmEQD_pFe0kIKmZIgJ74sSRCSSxeK9ckvZC2AlcqCSncm65NTsRR3ndjYM-GtAq15W_TkR4x5zaO3I6H_IJpuAJXfACNy01th7nBpbwwYtp41TcA_UdJKAi5aKbT7LZpI8N8FJSvXPeOT6Mv-UJsJG-EbLF1Rax817J4T5JlS8NREQSVGxmu5A3d5NWs39_rq-y8kuXhKdhvZgkjT8ScPcz-FT9LDJWdW0lb",
    fileType: "pptx",
    kind: LibraryAssetKind.AssetPack,
  },
  {
    slug: `${tutorialId}-notes-pdf`,
    sourcePath: "/library-sources/test_pdf.pdf",
    title: "Reference Notes (.pdf)",
    description:
      "Printable summary with key patterns and implementation checkpoints.",
    author: "Emma Stone",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCw-05pGCEXS6pmVmpAgty9dFGIS_3HBj6znxDYWDi2qzFRsuPspqd2uZkfqpud0AH5zWBLQzUMU31ren2liFuGJSsPRqp7JRzC7ckdGChg0v06Vg-vKIEnPezzIvLrKKTsC9Dy2UydcELndS6D-axPb62Vl2k2eBCtwQm2W6K0LbTyGOAZp3_m5NjsfuqGQTUXzToEOJvpO0FLwLitPTWb0Fp94BtBKGIkmKi4_9z2JREOqSnrALqoxc5jlA4UD_g8w-Mqy691GNNL",
    fileType: "pdf",
    kind: LibraryAssetKind.EBook,
  },
]

export type TutorialAttachedResource = {
  title: string
  meta: string
  kind: "pdf" | "docx" | "pptx"
  href: string
  downloadUrl: string
}

export type TutorialRelatedItem = {
  title: string
  meta: string
  image: string
}

export type TutorialInstructor = {
  name: string
  role: string
  bio: string
  image: string
}

export type TutorialDiscussionItem = {
  author: string
  postedAt: string
  message: string
}

export type TutorialDetailContent = {
  description: string[]
  attachedResources: TutorialAttachedResource[]
  instructor: TutorialInstructor
  relatedTutorials: TutorialRelatedItem[]
  quickLinks: string[]
  discussion: TutorialDiscussionItem[]
}

export type LibraryResourceCollection = CollectionCardData & {
  slug: string
  fileSlugs: string[]
}

export type LibraryTutorialCollection = CollectionCardData & {
  slug: string
  tagline: string
  students: string
  totalDuration: string
  oldPrice: string
  author: TutorialInstructor
  tutorials: CurriculumLesson[]
}

export const libraryTutorials: LibraryAsset[] = [
  {
    slug: "advanced-react-patterns-2024-masterclass",
    sourcePath: "/library-sources/test_mp4.mp4",
    title: "Advanced React Patterns: 2024 Masterclass",
    description:
      "Deep dive into memoization, custom hooks, and concurrent rendering.",
    author: "Sarah Drasner",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCLw5UVYLc7lDuIVAw137zZ3XeVCqPMUUFnBJTK3FMM_qNniLo4rugzap1zhIhTsrk7s4ZGcu7qIYAdZXzx495JxRULq9JeCp-zAPlQ6ZWcwmMCaJqDAe66LYvZ7p1Iyl7D1BZk6UHOWeAxhGyypwjn0jdWqgOTovR8L2LRaZP5UL_uGkNlbgYbKhPNuq-83kNbVL7eWs3Pk_WlbRWoD9JFc53Kg1lrwGoBee_xFcTx4hnz8eOnL-0J0XIgPa7c2MUU6vi3YqTrB-RO",
    kind: LibraryAssetKind.Tutorial,
  },
]

export const libraryResources: LibraryAsset[] = [
  {
    slug: "vintage-ui-kit-neumorphism-edition",
    sourcePath: "/library-sources/test_doc.docx",
    title: "Vintage UI Kit: Neumorphism Edition",
    description: "Archive of soft-shadowed components and legacy assets.",
    author: "Design Legacy",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    kind: LibraryAssetKind.Components,
    disabled: false,
  },
  {
    slug: "3d-abstract-icons-glassmorphism-vol-2",
    sourcePath: "/library-sources/test-pptx.pptx",
    title: "3D Abstract Icons: Glassmorphism Vol. 2",
    description: "High-resolution OBJ and PNG files for modern landing pages.",
    author: "PixelPerfect",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA5htpqjzJbIA9ysc1boQF2Ju-0Rf6kl8N3GU3FtgA2XmEQD_pFe0kIKmZIgJ74sSRCSSxeK9ckvZC2AlcqCSncm65NTsRR3ndjYM-GtAq15W_TkR4x5zaO3I6H_IJpuAJXfACNy01th7nBpbwwYtp41TcA_UdJKAi5aKbT7LZpI8N8FJSvXPeOT6Mv-UJsJG-EbLF1Rax817J4T5JlS8NREQSVGxmu5A3d5NWs39_rq-y8kuXhKdhvZgkjT8ScPcz-FT9LDJWdW0lb",
    kind: LibraryAssetKind.AssetPack,
  },
  {
    slug: "the-saas-launch-strategy-handbook",
    sourcePath: "/library-sources/the-saas-launch-strategy-handbook.md",
    title: "The SaaS Launch Strategy Handbook",
    description:
      "From zero to product-market fit in 90 days. Comprehensive guide.",
    author: "Marcus Aurelius",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCw-05pGCEXS6pmVmpAgty9dFGIS_3HBj6znxDYWDi2qzFRsuPspqd2uZkfqpud0AH5zWBLQzUMU31ren2liFuGJSsPRqp7JRzC7ckdGChg0v06Vg-vKIEnPezzIvLrKKTsC9Dy2UydcELndS6D-axPb62Vl2k2eBCtwQm2W6K0LbTyGOAZp3_m5NjsfuqGQTUXzToEOJvpO0FLwLitPTWb0Fp94BtBKGIkmKi4_9z2JREOqSnrALqoxc5jlA4UD_g8w-Mqy691GNNL",
    kind: LibraryAssetKind.EBook,
  },
  {
    slug: "tailwind-grid-masters-layout-kit",
    sourcePath: "/library-sources/tailwind-grid-masters-layout-kit.md",
    title: "Tailwind Grid Masters: Layout Kit",
    description:
      "50+ Responsive Bento and Asymmetric layouts for modern web apps.",
    author: "CSS King",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCFyoOcyf6L6CBN4i_u76grGO2d7ASBy737CHX5R2Qei5Z_JakOrfrqgdCQqsVRm8dAdB5b3wMU7ieOIGvM_EBm8hU-Li9XFnYoyaUMjMs3yxFFRB8bpVgbuoSqxqFLjaLce_ZzzTcJMaQDsShtH2B_maCuuZ1VRh2pqKkTYFBIQVdsADXWjdFHbi3Id-hDIPuYjJjmVsDcdgt_beYda01g1pd4QCQAVeHUWiAx9Ah7VbXEqi8BhIWlPxOGFV7gtuKeKiZPSdzwBiGh",
    kind: LibraryAssetKind.Components,
  },
]

export const resourceCollections: LibraryResourceCollection[] = [
  {
    id: "engineering-toolkit",
    slug: "engineering-toolkit",
    title: "Complete Engineering Toolkit",
    description: "Curated technical docs and assets for engineering workflows.",
    count: "5 Files",
    rating: "4.8",
    reviews: "320",
    price: "$29.00",
    discount: "20% OFF",
    href: "/library/resources/collections/engineering-toolkit",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    fileSlugs: [
      "advanced-react-patterns-2024-masterclass",
      "vintage-ui-kit-neumorphism-edition",
      "3d-abstract-icons-glassmorphism-vol-2",
      "the-saas-launch-strategy-handbook",
      "tailwind-grid-masters-layout-kit",
    ],
  },
]

export const tutorialCollections: LibraryTutorialCollection[] = [
  {
    id: "advanced-ui-design-masterclass",
    slug: "advanced-ui-design-masterclass",
    title: "Advanced UI Design Masterclass",
    description:
      "Structured tutorial collection for hierarchy, rhythm, and motion.",
    count: "5 Tutorials",
    rating: "4.9",
    reviews: "248",
    price: "$49.99",
    discount: "Save 62%",
    href: "/library/tutorials/collections/advanced-ui-design-masterclass",
    thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
    tagline: "Cinematic layouts and modern interaction patterns",
    students: "1,200",
    totalDuration: "5h 12m",
    oldPrice: "$129.99",
    author: {
      name: "Emma Stone",
      role: "Design Systems Lead",
      bio: "Builds production-ready UI systems with a focus on visual clarity and fast iteration.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    },
    tutorials: [
      {
        id: "intro-to-visual-systems",
        title: "Introduction to Visual Systems",
        duration: "12m",
        isPreview: true,
        videoSource: "/library-sources/test_mp4.mp4",
        poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        description: [
          "Start with the visual rules behind structured interfaces and how they guide user attention.",
          "This lesson focuses on hierarchy, scale, and the visual rhythm that keeps layouts readable.",
        ],
        resources: createTutorialFileResources("intro-to-visual-systems"),
        discussion: [
          {
            author: "Mina",
            postedAt: "1 hour ago",
            message:
              "The hierarchy breakdown made the layout priorities feel much clearer.",
          },
        ],
        instructor: {
          name: "Emma Stone",
          role: "Design Systems Lead",
          bio: "Builds production-ready UI systems with a focus on visual clarity and fast iteration.",
          image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        },
      },
      {
        id: "rhythm-scale-typography",
        title: "Rhythm, Scale, and Typography",
        duration: "34m",
        isPreview: true,
        videoSource: "/library-sources/test_mp4_2.mp4",
        poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        description: [
          "Typography decisions shape the entire interface composition.",
          "Use scale, spacing, and rhythm to keep dense layouts calm and purposeful.",
        ],
        resources: createTutorialFileResources("rhythm-scale-typography"),
        discussion: [
          {
            author: "Khoa",
            postedAt: "Today",
            message:
              "The spacing examples are directly usable in our dashboard revamp.",
          },
        ],
        instructor: {
          name: "Noah Chen",
          role: "Typography Specialist",
          bio: "Helps teams turn type systems into clear and scalable product interfaces.",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        },
      },
      {
        id: "layering-depth-surfaces",
        title: "Layering and Depth with Surfaces",
        duration: "48m",
        videoSource: "/library-sources/test_mp4_3.mp4",
        poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        description: [
          "Learn how surface layering can add separation without relying on heavy borders.",
          "The lesson shows how to combine color, blur, and elevation to create readable depth.",
        ],
        resources: createTutorialFileResources("layering-depth-surfaces"),
        discussion: [
          {
            author: "Linh",
            postedAt: "Yesterday",
            message:
              "The depth cues are subtle but they make the whole interface calmer.",
          },
        ],
        instructor: {
          name: "Ava Patel",
          role: "Product Designer",
          bio: "Focuses on motion, surfaces, and interface depth for premium-feeling products.",
          image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
        },
      },
      {
        id: "intentional-asymmetry",
        title: "Designing Intentional Asymmetry",
        duration: "51m",
        videoSource: "/library-sources/test_mp4_4.mp4",
        poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        description: [
          "Asymmetry adds energy, but it has to be intentional to stay legible.",
          "This lesson explains how to preserve balance while breaking rigid grid patterns.",
        ],
        resources: createTutorialFileResources("intentional-asymmetry"),
        discussion: [
          {
            author: "Nam",
            postedAt: "2 days ago",
            message:
              "The tension examples helped us make the marketing hero feel less generic.",
          },
        ],
        instructor: {
          name: "Iris Morgan",
          role: "Creative Director",
          bio: "Designs editorial interfaces with confident rhythm and controlled asymmetry.",
          image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df",
        },
      },
      {
        id: "premium-dashboard-case-study",
        title: "Case Study: Premium Dashboard",
        duration: "39m",
        videoSource: "/library-sources/test_mp4_5.mp4",
        poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        description: [
          "Bring the system together by reviewing a premium dashboard implementation end to end.",
          "The case study emphasizes practical tradeoffs, polish, and consistent interaction patterns.",
        ],
        resources: createTutorialFileResources("premium-dashboard-case-study"),
        discussion: [
          {
            author: "Thu",
            postedAt: "3 days ago",
            message:
              "This case study is the closest thing to a real client handoff I've seen here.",
          },
        ],
        instructor: {
          name: "Leo Wright",
          role: "Principal Product Designer",
          bio: "Brings together systems thinking, motion, and product judgment for production UI.",
          image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
        },
      },
    ],
  },
]

export const tutorialDetailsBySlug: Record<string, TutorialDetailContent> = {
  "advanced-react-patterns-2024-masterclass": {
    description: [
      "This purchased tutorial explains practical React architecture patterns for large-scale front-end codebases.",
      "You will learn memoization boundaries, custom hooks composition, and concurrent rendering strategies to keep UX responsive.",
      "The content is optimized for implementation-first learning: each section maps to a specific production scenario.",
    ],
    attachedResources: [
      {
        title: "Lecture Notes.pdf",
        meta: "12MB • PDF Document",
        kind: "pdf",
        href: "/library-sources/test_pdf.pdf",
        downloadUrl: "/library-sources/test_pdf.pdf",
      },
      {
        title: "Assignment 1.docx",
        meta: "2MB • Microsoft Word",
        kind: "docx",
        href: "/library-sources/test_doc.docx",
        downloadUrl: "/library-sources/test_doc.docx",
      },
      {
        title: "Quantum Simulator Worksheet.pptx",
        meta: "4.5MB • PPTX Presentation",
        kind: "pptx",
        href: "/library-sources/test-pptx.pptx",
        downloadUrl: "/library-sources/test-pptx.pptx",
      },
    ],
    instructor: {
      name: "Dr. Sarah Jenkins",
      role: "Quantum Theory Lead",
      bio: "Author of The Quantum Leap. 15 years of research in superconducting circuits and computational models.",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDKJ-vamvUUntVXvmtjuXn7hggTfn2-6yRo1a-rUQlrEa0f3c4vSEOLc952j23H02HolVC0qYbnug2vx5fe2dyYNDM3FMp3QwXQWNdYJe5QXhJ3RXiYj5pZVI0qxeV2ise32UIgCdRjuwD3-tN9pg1DcvV90EfkXMt0zRdlj23wDVqGVu1Gerc-iPQ-8u0k9zje4aAXv4OgPkfjAgbke61Jt2XXPe-gpNcxibHCvoD5ClXF7O5TV0DACTxuU1p5wJ-VHo2o0gpjxnwk",
    },
    relatedTutorials: [
      {
        title: "Cryptography & Security",
        meta: "45 min • Intermediate",
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDKrsmtI_ZqPOiyB5a_w9qqw93bAbPUIfeB35PQkWxRDYPgjaJACDn9UPEyZSy_ejoSdv1YUkJhFUsoomew7gRf75ol-4V4JV1dYayt6GFeKBS5XpzCXzRnreBdGMGBjeXPNP1Yogf50e0S3rHTmKKmVAGeu674-oNGp7XNjntkz_kvfUJm1cC0Ac7UiwtD1sl2nt_3oqDRypQhlVcINiUOcUoirCq1mQJXgs1M-wNdffnYmDIlTwkH7OC7nAjOfXpAe8jE9I8dHtEl",
      },
      {
        title: "Linear Algebra for Physics",
        meta: "1h 20 min • Beginner",
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAulzNJc30CmkreQDfrk1L59npzJ4-oBkVuAbtrMjiiPwfziuL90ch3zUpxkvSNdmLq-Tp1vTtN8G53yXqBi81IY8gg-MUG9uSMvJE1ZaO6xQxfkHwIUWmal-PdLZwBpW5u5mukJQtKRl4fWcapkyQMFFAR25Ia-ehcsa9G-tAr7yzrzNubAUW-AHnLfi4KfKJ9tk1ZdoliJkR6FgKl9tzT0Fq0ybge6z6jhDXxG4si_5s_b1IyK5CQ9oET52v0ZNqr574GPHEezZXr",
      },
      {
        title: "Particle Physics 101",
        meta: "58 min • Advanced",
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBIAbyBgdVaAzwgHhlDLhNyxwqmg0DF7Lji2u5ZSQlaXhzPOQ8osbQ-eoshUL7jV8YQ0rdSCSCB2PSguSQlqgOrnnB_3wIXKFMqHyDuWFIsFhVd9vGLuj2-6iX5vz5UHNhQn1YqnhSNPgtMMKNiKuX4LfCq9BcJjbgNLRDFbGee3nGnn_Kjb_1CokRelp09eQNi2nOIS0R09Y7rmm9aESgaoPpylD7bH-3FzV--gjfQna9mDg5J9yvO5y_iT-JFtALcdgPYLuWRUqPj",
      },
    ],
    quickLinks: [
      "Syllabus Overview",
      "Recommended Reading",
      "Community Forums",
    ],
    discussion: [
      {
        author: "Alex Martin",
        postedAt: "2 hours ago",
        message:
          "The section on concurrent rendering made our dashboard much smoother. Great walkthrough.",
      },
      {
        author: "Linh Tran",
        postedAt: "Yesterday",
        message:
          "Would love a deeper example on error boundaries with data fetching in nested routes.",
      },
    ],
  },
}

export type LibraryCatalog = {
  resources: LibraryAsset[]
  tutorials: LibraryAsset[]
  resourceCollections: CollectionCardData[]
  tutorialCollections: CollectionCardData[]
}

export const libraryCatalog: LibraryCatalog = {
  resources: libraryResources,
  tutorials: libraryTutorials,
  resourceCollections,
  tutorialCollections,
}

export const libraryAssets: LibraryAsset[] = [
  ...libraryTutorials,
  ...libraryResources,
]
