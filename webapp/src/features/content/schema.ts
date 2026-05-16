import z from "zod"

import { CollectionType, CourseStatus } from "./types"

// --- Validation Schema (khớp với CreateCollectionDto) ---
export const collectionSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(128, "Title is too long"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(500),
    hightlights: z
      .array(
        z.object({
          value: z.string().min(10, "Highlight must be at least 10 characters"),
        })
      )
      .min(1, "At least one highlight is required")
      .max(10),
    majorId: z.string().min(1, "Major is required"),
    courseId: z.string().min(1, "Course is required"),
    type: z.nativeEnum(CollectionType, {
      message: "Collection type is required",
    }),
    discount: z.number().min(0).max(100),
    resourceIds: z.array(z.string()).optional(),
    tutorialIds: z.array(z.string()).optional(),
    thumbnailBase64: z.string().optional(),
    thumbnailFile: z
      .any()
      .refine(
        (file) => !file || (file instanceof File && file.size <= 2 * 1024 * 1024),
        "Kích thước ảnh không được vượt quá 2MB"
      )
      .optional(),
    phases: z
      .array(
        z.object({
          id: z.string().optional(),
          phaseTitle: z.string().min(1, "Phase title is required"),
          learningGoal: z.string(),
          items: z.array(
            z.object({
              id: z.string().optional(),
              itemId: z.string().min(1),
              itemType: z.enum(["RESOURCE", "TUTORIAL"]),
            })
          ),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Both types require phases (Roadmap sections)
    if (!data.phases || data.phases.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Collection must contain at least one phase (section)",
        path: ["phases"],
      })
      return
    }

    // ── RESOURCE Collection constraints ──
    if (data.type === CollectionType.RESOURCE) {
      const hasResource = data.phases.some((p) => p.items.some((i) => i.itemType === "RESOURCE"))
      if (!hasResource) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Resource collection must contain at least one resource",
          path: ["phases"],
        })
      }

      const hasInvalidItem = data.phases.some((p) => p.items.some((i) => i.itemType !== "RESOURCE"))
      if (hasInvalidItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Resource collection phases cannot contain tutorials",
          path: ["phases"],
        })
      }
    }

    // ── TUTORIAL Collection constraints ──
    if (data.type === CollectionType.TUTORIAL) {
      const hasTutorial = data.phases.some((p) => p.items.some((i) => i.itemType === "TUTORIAL"))
      if (!hasTutorial) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tutorial roadmap must contain at least one tutorial",
          path: ["phases"],
        })
      }

      const hasInvalidItem = data.phases.some((p) => p.items.some((i) => i.itemType !== "TUTORIAL"))
      if (hasInvalidItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tutorial roadmap cannot contain direct resources",
          path: ["phases"],
        })
      }
    }
  })

export type CollectionFormValues = z.infer<typeof collectionSchema>

// --- Validation Schema (khớp với CreateResourceDto) ---
const fileSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileSizeBytes: z.number().positive("File size must be positive"),
  mimeType: z.string().optional(),
})

export const resourceSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(128, "Title is too long"),
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(256),
  hightlights: z
    .array(
      z.object({
        value: z.string().min(10, "Highlight must be at least 10 characters"),
      })
    )
    .min(1, "At least one highlight is required")
    .max(10),
  majorId: z.string().min(1, "Major is required"),
  courseId: z.string().min(1, "Course is required"),
  price: z.number().min(0, "Price must be positive"),
  files: z.array(fileSchema).min(1, "At least one file is required"),
  collectionId: z.string().optional(),
  thumbnailBase64: z.string().optional(),
  thumbnailFile: z
    .any()
    .refine(
      (file) => !file || (file instanceof File && file.size <= 2 * 1024 * 1024),
      "Kích thước ảnh không được vượt quá 2MB"
    )
    .optional(),
})

export type ResourceFormValues = z.infer<typeof resourceSchema>

// --- Validation Schema (khớp với backend payload) ---
export const tutorialSchema = z.object({
  title: z
    .string()
    .min(8, "Title must be at least 8 characters")
    .max(128, "Title is too long"),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(500),
  hightlights: z
    .array(
      z.object({
        value: z.string().min(10, "Highlight must be at least 10 characters"),
      })
    )
    .min(1, "At least one highlight is required")
    .max(10),
  majorId: z.string().min(1, "Major is required"),
  courseId: z.string().min(1, "Course is required"),
  price: z.number().min(0, "Price must be positive"),
  discountBundle: z.number().min(0).max(100),
  fileName: z.string().min(1, "File name is required"),
  fileSizeBytes: z.number().positive(),
  videoDurationSeconds: z.number().positive(),
  // Resource attachment mode: "collection" uses a pre-built Resource Collection,
  // "manual" uses the ResourceExplorer + TutorialStepBuilder
  resourceAttachmentMode: z.enum(["collection", "manual"]),
  // Used when mode = "collection": ID of the selected Resource Collection
  collectionId: z.string().optional(),
  // Used when mode = "manual": step-by-step resource organization
  steps: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1, "Step title is required"),
        resources: z.array(
          z.object({
            id: z.string().optional(),
            resourceId: z.string().min(1),
            instructionNote: z.string(),
          })
        ),
      })
    )
    .optional(),
})

export type TutorialFormValues = z.infer<typeof tutorialSchema>

export const courseSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  majorId: z.string().min(1, "Major is required"),
  credits: z.number().min(1, "Credits must be a positive number"),
  semester: z.number().min(1, "Semester must be a positive number"),
  isCompulsory: z.boolean(),
  status: z.nativeEnum(CourseStatus).optional(),
})

export type CourseFormValues = z.infer<typeof courseSchema>
