import z from "zod"

import { CollectionType, CourseStatus } from "./types"
import {
  RESOURCE_ALLOWED_FILE_TYPES_COPY,
  isAllowedResourceFileName,
} from "./utils/resource-file-validation"
import {
  TUTORIAL_ALLOWED_FILE_TYPE_COPY,
  isAllowedTutorialFileName,
} from "./utils/tutorial-file-validation"

// --- Validation Schema (khớp với CreateCollectionDto) ---
export const collectionSchema = z
  .object({
    title: z
      .string()
      .min(3, "Please enter a title with at least 3 characters.")
      .max(128, "Please use a shorter title."),
    description: z.string().min(10, "Please add a short description.").max(500),
    hightlights: z
      .array(
        z.object({
          value: z.string().min(10, "Please write a little more detail."),
        })
      )
      .min(1, "Please add at least one highlight.")
      .max(10),
    majorId: z.string().min(1, "Please choose a major."),
    courseId: z.string().min(1, "Please choose a course."),
    type: z.nativeEnum(CollectionType, {
      message: "Please choose what this collection is for.",
    }),
    discount: z.number().min(0).max(100),
    resourceIds: z.array(z.string()).optional(),
    tutorialIds: z.array(z.string()).optional(),
    thumbnailBase64: z.string().optional(),
    thumbnailFile: z
      .any()
      .refine(
        (file) =>
          !file || (file instanceof File && file.size <= 2 * 1024 * 1024),
        "Kích thước ảnh không được vượt quá 2MB"
      )
      .optional(),
    phases: z
      .array(
        z.object({
          id: z.string().optional(),
          phaseTitle: z.string().min(1, "Please name this section."),
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
        message: "Please add at least one section to this collection.",
        path: ["phases"],
      })
      return
    }

    // ── RESOURCE Collection constraints ──
    if (data.type === CollectionType.RESOURCE) {
      const hasResource = data.phases.some((p) =>
        p.items.some((i) => i.itemType === "RESOURCE")
      )
      if (!hasResource) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add at least one resource to this collection.",
          path: ["phases"],
        })
      }

      const hasInvalidItem = data.phases.some((p) =>
        p.items.some((i) => i.itemType !== "RESOURCE")
      )
      if (hasInvalidItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This resource collection can only include resources.",
          path: ["phases"],
        })
      }
    }

    // ── TUTORIAL Collection constraints ──
    if (data.type === CollectionType.TUTORIAL) {
      const hasTutorial = data.phases.some((p) =>
        p.items.some((i) => i.itemType === "TUTORIAL")
      )
      if (!hasTutorial) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add at least one tutorial to this collection.",
          path: ["phases"],
        })
      }

      const hasInvalidItem = data.phases.some((p) =>
        p.items.some((i) => i.itemType !== "TUTORIAL")
      )
      if (hasInvalidItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This tutorial collection can only include tutorials.",
          path: ["phases"],
        })
      }
    }
  })

export type CollectionFormValues = z.infer<typeof collectionSchema>

// --- Validation Schema (khớp với CreateResourceDto) ---
const fileSchema = z.object({
  fileName: z
    .string()
    .min(1, "Please choose a file.")
    .refine(
      isAllowedResourceFileName,
      `Resources only support ${RESOURCE_ALLOWED_FILE_TYPES_COPY} files.`
    ),
  fileSizeBytes: z.number().positive("Please choose a file with content."),
  mimeType: z.string().optional(),
})

export const resourceSchema = z.object({
  title: z
    .string()
    .min(3, "Please enter a title with at least 3 characters.")
    .max(128, "Please use a shorter title."),
  summary: z.string().min(10, "Please add a short summary.").max(256),
  hightlights: z
    .array(
      z.object({
        value: z.string().min(10, "Please write a little more detail."),
      })
    )
    .min(1, "Please add at least one highlight.")
    .max(10),
  majorId: z.string().min(1, "Please choose a major."),
  courseId: z.string().min(1, "Please choose a course."),
  price: z.number().min(0, "Price cannot be negative."),
  files: z.array(fileSchema).min(1, "Please add at least one file."),
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
    .min(8, "Please enter a more descriptive title.")
    .max(128, "Please use a shorter title."),
  description: z
    .string()
    .min(50, "Please describe what learners will get from this tutorial.")
    .max(500),
  hightlights: z
    .array(
      z.object({
        value: z.string().min(10, "Please write a little more detail."),
      })
    )
    .min(1, "Please add at least one highlight.")
    .max(10),
  majorId: z.string().min(1, "Please choose a major."),
  courseId: z.string().min(1, "Please choose a course."),
  price: z.number().min(0, "Price cannot be negative."),
  discountBundle: z.number().min(0).max(100),
  fileName: z
    .string()
    .min(1, "Please choose a video.")
    .refine(
      isAllowedTutorialFileName,
      `Tutorial videos must be ${TUTORIAL_ALLOWED_FILE_TYPE_COPY} files.`
    ),
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
        title: z.string().min(1, "Please name this step."),
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
  code: z.string().min(1, "Please enter a course code."),
  name: z.string().min(1, "Please enter a course name."),
  majorId: z.string().min(1, "Please choose a major."),
  credits: z.number().min(1, "Credits must be at least 1."),
  semester: z.number().min(1, "Semester must be at least 1."),
  isCompulsory: z.boolean(),
  status: z.nativeEnum(CourseStatus).optional(),
})

export type CourseFormValues = z.infer<typeof courseSchema>
