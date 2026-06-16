/* @jest-environment node */

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { HonestFitCard } from "../src/features/content/components/honest-fit-card"
import { StartHereSteps } from "../src/features/content/components/start-here-steps"
import { VerifiedFitBadge } from "../src/features/content/components/verified-fit-badge"
import { FitStatus, type LearningFit } from "../src/features/content/types"

const verifiedFit: LearningFit = {
  bestFor: ["Students preparing for a calculus midterm"],
  notFor: ["Students looking for complete exam answers"],
  startHere: [
    {
      title: "Try the worked example",
      order: 2,
      aiPrompt: "Quiz me on derivative mistakes",
    },
    {
      title: "Read the recap",
      order: 1,
    },
  ],
  coveredTopics: ["Derivatives"],
  notCoveredTopics: [],
  learningOutcomes: [],
  estimatedStudyTimeMinutes: 45,
  difficulty: null,
  fitStatus: FitStatus.VERIFIED,
  fitEvidence: [
    {
      claim: "Draft based on extracted resource metadata",
      sourceType: "CONTENT_EXTRACTION",
      sourceRef: "resource:calculus",
      confidence: 0.82,
    },
  ],
}

describe("learning fit components", () => {
  test("HonestFitCard renders fit guidance and verified badge", () => {
    const html = renderToStaticMarkup(
      React.createElement(HonestFitCard, {
        fit: verifiedFit,
        contentType: "resource",
      })
    )

    expect(html).toContain("Honest fit for this resource")
    expect(html).toContain("Best for")
    expect(html).toContain("Students preparing for a calculus midterm")
    expect(html).toContain("Not for")
    expect(html).toContain("Students looking for complete exam answers")
    expect(html).toContain("Verified Fit")
  })

  test("HonestFitCard renders nothing without useful fit data", () => {
    const html = renderToStaticMarkup(
      React.createElement(HonestFitCard, {
        fit: {
          bestFor: [],
          notFor: [],
          startHere: [],
          fitStatus: FitStatus.DRAFT,
        },
        contentType: "tutorial",
      })
    )

    expect(html).toBe("")
  })

  test("VerifiedFitBadge only renders for VERIFIED status", () => {
    expect(
      renderToStaticMarkup(
        React.createElement(VerifiedFitBadge, { fit: verifiedFit })
      )
    ).toContain("Verified Fit")

    expect(
      renderToStaticMarkup(
        React.createElement(VerifiedFitBadge, {
          fit: { ...verifiedFit, fitStatus: FitStatus.NEEDS_EVIDENCE },
        })
      )
    ).toBe("")
  })

  test("StartHereSteps sorts by order and renders AI prompt copy", () => {
    const html = renderToStaticMarkup(
      React.createElement(StartHereSteps, {
        steps: verifiedFit.startHere,
      })
    )

    expect(html.indexOf("Read the recap")).toBeLessThan(
      html.indexOf("Try the worked example")
    )
    expect(html).toContain("Ask Buddy AI")
    expect(html).toContain("Quiz me on derivative mistakes")
  })
})
