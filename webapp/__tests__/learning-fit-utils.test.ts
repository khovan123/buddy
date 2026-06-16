/* @jest-environment node */

import { FitStatus, LearningFitDifficulty } from "../src/features/content/types"
import {
  getFitAwareFreeLabel,
  getFitAwarePurchaseLabel,
  getLearningPathStats,
} from "../src/features/content/utils/learning-fit-copy"
import {
  toLearningFitFormValues,
  toLearningFitPayload,
} from "../src/features/content/utils/learning-fit"

describe("learning fit utilities", () => {
  test("maps complete form values with evidence to a verified learning fit payload", () => {
    const payload = toLearningFitPayload({
      bestFor: [{ value: "Students preparing for a calculus midterm" }],
      notFor: [{ value: "Students looking for complete past exam answers" }],
      startHere: [
        {
          title: "Review the recap",
          order: 2,
          targetType: "AI_PROMPT",
          aiPrompt: "Quiz me on core mistakes",
        },
        {
          title: "Try the first example",
          order: 1,
        },
      ],
      coveredTopics: [{ value: "Derivatives" }],
      notCoveredTopics: [],
      learningOutcomes: [{ value: "Solve common derivative exercises" }],
      estimatedStudyTimeMinutes: 45,
      difficulty: LearningFitDifficulty.INTERMEDIATE,
      fitEvidence: [
        {
          claim: "Draft based on extracted resource metadata",
          sourceType: "CONTENT_EXTRACTION",
          sourceRef: "resource:calculus-review",
          confidence: 0.8,
        },
      ],
      fitGeneratedAt: "2026-06-16T10:00:00.000Z",
      fitVerifiedAt: "2026-06-16T10:00:00.000Z",
    })

    expect(payload).toMatchObject({
      fitStatus: FitStatus.VERIFIED,
      bestFor: ["Students preparing for a calculus midterm"],
      notFor: ["Students looking for complete past exam answers"],
      startHere: [
        { title: "Try the first example", order: 1 },
        { title: "Review the recap", order: 2 },
      ],
      fitEvidence: [
        {
          claim: "Draft based on extracted resource metadata",
          sourceType: "CONTENT_EXTRACTION",
        },
      ],
    })
  })

  test("marks complete fit metadata as needs evidence when no evidence is present", () => {
    const payload = toLearningFitPayload({
      bestFor: [{ value: "Students preparing for a calculus midterm" }],
      notFor: [{ value: "Students looking for complete past exam answers" }],
      startHere: [{ title: "Try the first example", order: 1 }],
      coveredTopics: [],
      notCoveredTopics: [],
      learningOutcomes: [],
    })

    expect(payload).toMatchObject({
      fitStatus: FitStatus.NEEDS_EVIDENCE,
      fitEvidence: [],
      fitVerifiedAt: null,
    })
  })

  test("returns undefined when the editor contains no useful fit metadata", () => {
    expect(
      toLearningFitPayload({
        bestFor: [],
        notFor: [],
        startHere: [],
        coveredTopics: [],
        notCoveredTopics: [],
        learningOutcomes: [],
      })
    ).toBeUndefined()
  })

  test("round-trips API fit data into editor values", () => {
    const values = toLearningFitFormValues({
      bestFor: ["Midterm review"],
      notFor: ["Full course replacement"],
      startHere: [{ title: "Open section 1", order: 1 }],
      coveredTopics: ["Limits"],
      notCoveredTopics: [],
      learningOutcomes: [],
      estimatedStudyTimeMinutes: null,
      difficulty: null,
      fitStatus: FitStatus.DRAFT,
      fitEvidence: [
        {
          claim: "Draft based on metadata",
          sourceType: "METADATA",
          sourceRef: "metadata",
          confidence: 0.55,
        },
      ],
      fitGeneratedAt: "2026-06-16T10:00:00.000Z",
      fitVerifiedAt: null,
    })

    expect(values).toMatchObject({
      bestFor: [{ value: "Midterm review" }],
      notFor: [{ value: "Full course replacement" }],
      estimatedStudyTimeMinutes: undefined,
      difficulty: undefined,
      fitEvidence: [
        {
          claim: "Draft based on metadata",
          sourceType: "METADATA",
          sourceRef: "metadata",
          confidence: 0.55,
        },
      ],
      fitGeneratedAt: "2026-06-16T10:00:00.000Z",
    })
  })

  test("returns path-oriented CTA labels and stats", () => {
    expect(
      getFitAwarePurchaseLabel({
        contentType: "collection",
        fit: null,
      })
    ).toBe("Start this learning path")
    expect(getFitAwareFreeLabel("resource")).toBe("Start this study step")
    expect(
      getLearningPathStats([
        {
          phaseTitle: "Foundation",
          learningGoal: "Understand the basics",
          items: [{ itemId: "r1", itemType: "RESOURCE" }],
        },
      ])
    ).toMatchObject({
      checkpointCount: 1,
      itemCount: 1,
      firstCheckpointTitle: "Foundation",
      hasPath: true,
    })
  })
})
