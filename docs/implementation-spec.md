# Buddy - Implementation Spec: Premium Learning Fit System

## Muc Tieu

Spec nay chuyen ket qua brainstorming thanh ke hoach trien khai cho he thong premium UI/UX xoay quanh `Honest Fit Card`, `Verified Fit`, va learning path cho 3 loai content: `Resource`, `Tutorial`, `Collection`.

Muc tieu product:

- Lam Buddy nhin va cam nhan premium hon bang `Trust + Clarity + Access`.
- Tang buyer confidence: user biet noi dung co phu hop khong truoc khi mua.
- Bien content detail tu catalog item thanh learning decision page.
- Rollout tu `Resource MVP` truoc, sau do mo rong sang `Tutorial`, roi `Collection`.

## Current Code Context

### Existing Content Models

`content-service` hien co 3 Mongoose schemas:

- `Resource`: title, slug, summary, hightlights, major/course, price, status, moderation, `isVerified`, meta, thumbnail, preview key.
- `Tutorial`: title, slug, description, hightlights, media, price, discount, resourceIds, collectionIds, `steps`.
- `Collection`: title, slug, description, hightlights, type, discount, resourceIds, `phases`.

Collection da co concept gan voi roadmap:

- `CollectionPhase`
- `CollectionPhaseItem`
- `phases`

Day la loi the de bien collection thanh `Learning Path`.

### Existing Webapp Touchpoints

Detail pages:

- `webapp/src/app/(private)/explore/resources/[id]/page.tsx`
- `webapp/src/app/(private)/explore/tutorials/[id]/page.tsx`
- `webapp/src/app/(private)/explore/resources/collections/[id]/page.tsx`
- `webapp/src/app/(private)/explore/tutorials/collections/[id]/page.tsx`

Create/edit workflows:

- `webapp/src/features/content/components/create-resource-form.tsx`
- `webapp/src/features/content/components/create-tutorial-form.tsx`
- `webapp/src/features/content/components/create-collection-form.tsx`

Shared types:

- `webapp/src/features/content/types/index.ts`
- `webapp/src/features/content/schema.ts`

Purchase CTA:

- `webapp/src/features/billing/components/purchase-button.tsx`

## Product Principle

Premium cua Buddy khong phai luxury visual. Premium cua Buddy la:

```txt
No guesswork learning marketplace
```

Moi content detail page phai tra loi:

1. Noi dung nay phu hop voi ai?
2. Noi dung nay khong phu hop voi ai?
3. Mua xong nen hoc buoc nao dau tien?
4. Creator/content co tin duoc khong?
5. Gia tri minh nhan duoc la gi?

## Shared Domain Model

### Proposed Shared Fields

Ap dung cho `Resource`, `Tutorial`, `Collection`.

```ts
type FitStatus = 'DRAFT' | 'NEEDS_EVIDENCE' | 'VERIFIED' | 'EXPIRED'

interface StartHereStep {
  title: string
  description?: string
  order: number
  targetType?: 'SECTION' | 'FILE' | 'VIDEO_STEP' | 'COLLECTION_PHASE' | 'AI_PROMPT'
  targetId?: string
  aiPrompt?: string
}

interface FitEvidence {
  claim: string
  sourceType: 'METADATA' | 'CONTENT_EXTRACTION' | 'CREATOR_INPUT' | 'AI_GENERATED' | 'MODERATION'
  sourceRef?: string
  confidence?: number
}

interface LearningFit {
  bestFor: string[]
  notFor: string[]
  startHere: StartHereStep[]
  coveredTopics: string[]
  notCoveredTopics: string[]
  learningOutcomes: string[]
  estimatedStudyTimeMinutes?: number
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  fitStatus: FitStatus
  fitEvidence: FitEvidence[]
  fitGeneratedAt?: string
  fitVerifiedAt?: string
}
```

### MVP Field Scope

Trong MVP, khong can lam het evidence AI. Can cac field sau:

- `bestFor: string[]`
- `notFor: string[]`
- `startHere: StartHereStep[]`
- `fitStatus: 'DRAFT' | 'VERIFIED'`
- `coveredTopics?: string[]`
- `notCoveredTopics?: string[]`
- `estimatedStudyTimeMinutes?: number`
- `learningOutcomes?: string[]`

`fitEvidence` co the them o Phase 3.

## Backend Implementation Spec

### Content-Service Schema Changes

Add subdocuments vao:

- `services/content-service/src/infrastructure/persistence/mongo/schemas/resource.schema.ts`
- `services/content-service/src/infrastructure/persistence/mongo/schemas/tutorial.schema.ts`
- `services/content-service/src/infrastructure/persistence/mongo/schemas/collection.schema.ts`

Recommended shape:

```ts
export enum FitStatus {
  DRAFT = 'DRAFT',
  NEEDS_EVIDENCE = 'NEEDS_EVIDENCE',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
}

@Schema({ _id: false })
export class StartHereStep {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({ type: Number, required: true })
  order!: number;

  @Prop({ type: String, default: null })
  targetType?: string | null;

  @Prop({ type: String, default: null })
  targetId?: string | null;

  @Prop({ type: String, default: null })
  aiPrompt?: string | null;
}

@Schema({ _id: false })
export class LearningFit {
  @Prop({ type: [String], default: [] })
  bestFor!: string[];

  @Prop({ type: [String], default: [] })
  notFor!: string[];

  @Prop({ type: [StartHereStepSchema], default: [] })
  startHere!: StartHereStep[];

  @Prop({ type: [String], default: [] })
  coveredTopics!: string[];

  @Prop({ type: [String], default: [] })
  notCoveredTopics!: string[];

  @Prop({ type: [String], default: [] })
  learningOutcomes!: string[];

  @Prop({ type: Number, default: null })
  estimatedStudyTimeMinutes?: number | null;

  @Prop({ type: String, default: null })
  difficulty?: string | null;

  @Prop({ type: String, enum: FitStatus, default: FitStatus.DRAFT })
  fitStatus!: FitStatus;
}
```

Then add:

```ts
@Prop({ type: LearningFitSchema, default: null })
learningFit?: LearningFit | null;
```

### DTO Changes

Add shared DTOs under `services/content-service/src/presentation/http/dtos/`, for example:

- `learning-fit.dto.ts`

Fields:

- `bestFor`
- `notFor`
- `startHere`
- `coveredTopics`
- `notCoveredTopics`
- `learningOutcomes`
- `estimatedStudyTimeMinutes`
- `difficulty`

Validation rules:

- `bestFor`: optional array in create/update, max 5 items, each 8-160 chars.
- `notFor`: optional array in create/update, max 5 items, each 8-160 chars.
- `startHere`: optional array, max 5 steps.
- if `learningFit` is present and `fitStatus` should become `VERIFIED`, require:
  - at least 1 `bestFor`
  - at least 1 `notFor`
  - at least 1 `startHere`
- MVP should not allow client to set `fitStatus` directly to final privileged state unless backend validation passes.

Add `learningFit?: LearningFitDto` to:

- `CreateResourceDto`
- `UpdateResourceDto`
- `CreateTutorialDto`
- `UpdateTutorialDto`
- `CreateCollectionDto`
- `UpdateCollectionDto`

### Command/Repository Changes

Update create/update commands and handlers:

- resource create/update command + handler
- tutorial create/update command + handler
- collection create/update command + handler
- Mongo repositories mapping from document to domain/response.

Acceptance:

- Existing content creation still works when `learningFit` omitted.
- Existing documents without `learningFit` render safely as `null`.
- Update APIs can persist learning fit without changing upload/media flow.

### Gateway/API Consideration

Current code indicates downstream content-service has update routes for resources/tutorials/collections. Gateway route parity should be verified before implementation. If gateway lacks corresponding update routes, add/align:

- `PUT /v1/resources/:id`
- `PUT /v1/tutorials/:id`
- `PUT /v1/collections/:id`

The gateway should proxy `learningFit` transparently.

### AI Fit Draft Endpoint Contract

Implemented route mapping:

- Gateway: `POST /v1/recommendations/rag/fit-draft`
- RAG service upstream: `POST /v1/rag/fit-draft`
- Gateway guard: JWT auth + subscription/search policies.

Request body:

```json
{
  "contentType": "RESOURCE",
  "title": "React Hooks for Beginners",
  "summary": "Short resource summary",
  "description": "Longer creator description",
  "hightlights": ["Hooks basics", "useEffect examples"],
  "steps": [
    {
      "title": "Watch intro",
      "description": "Start with the overview lesson",
      "order": 1
    }
  ],
  "phases": [],
  "majorId": "major-id",
  "courseId": "course-id",
  "topK": 5
}
```

Notes:

- `contentType` accepts `RESOURCE`, `TUTORIAL`, or `COLLECTION`.
- `summary` is mainly for resources; `description` is mainly for tutorials/collections.
- `steps` should be sent for tutorial context; `phases` should be sent for collection roadmap context.
- `hightlights` keeps the existing project spelling for API compatibility.

Response body:

```json
{
  "learningFit": {
    "bestFor": ["Learners who already know basic JavaScript"],
    "notFor": ["Learners looking for advanced React architecture"],
    "startHere": [
      {
        "title": "Read the overview",
        "description": "Use this first to understand the goal of the resource",
        "order": 1,
        "targetType": "SECTION",
        "targetId": null,
        "aiPrompt": null
      }
    ],
    "coveredTopics": ["React hooks", "useEffect"],
    "notCoveredTopics": ["State management libraries"],
    "learningOutcomes": ["Explain when to use useEffect"],
    "estimatedStudyTimeMinutes": 45,
    "difficulty": "BEGINNER",
    "fitStatus": "VERIFIED",
    "fitEvidence": [
      {
        "claim": "Best for learners with basic JavaScript",
        "sourceType": "CONTENT_EXTRACTION",
        "sourceRef": "source-slug",
        "confidence": 0.74
      }
    ],
    "fitGeneratedAt": "2026-06-16T10:00:00.000Z",
    "fitVerifiedAt": "2026-06-16T10:00:00.000Z"
  },
  "sources": [
    {
      "itemId": "content-id",
      "slug": "react-hooks",
      "itemType": "RESOURCE",
      "title": "React Hooks",
      "score": 0.82,
      "chunkText": "Relevant extracted context"
    }
  ],
  "model": "gemini-2.5-flash",
  "tokensUsed": 512,
  "retrievalTimeMs": 24.5,
  "generationTimeMs": 812.3,
  "fallbackUsed": false
}
```

Behavior:

- RAG query is built from `title`, `summary`, `description`, and `hightlights`.
- Retrieval applies `majorId` and `courseId` filters when present.
- Gemini must return JSON; RAG service normalizes the result into the shared `LearningFit` shape.
- `fitStatus` is normalized to `VERIFIED` only when `bestFor`, `notFor`, `startHere`, and at least one valid `fitEvidence` item are present.
- Complete fit metadata without evidence is normalized to `NEEDS_EVIDENCE`; incomplete fit metadata remains `DRAFT`.
- If embedding/vector retrieval is not ready, the endpoint continues with metadata-only generation.
- If model generation fails, the endpoint returns a deterministic metadata/RAG fallback with `fallbackUsed: true`.
- The frontend `FitEditor` writes the returned draft into form state; creator save/update remains the persistence boundary.

## Frontend Implementation Spec

### Shared Types

Update `webapp/src/features/content/types/index.ts`:

```ts
export type FitStatus = 'DRAFT' | 'NEEDS_EVIDENCE' | 'VERIFIED' | 'EXPIRED'

export interface StartHereStep {
  title: string
  description?: string
  order: number
  targetType?: 'SECTION' | 'FILE' | 'VIDEO_STEP' | 'COLLECTION_PHASE' | 'AI_PROMPT'
  targetId?: string
  aiPrompt?: string
}

export interface LearningFit {
  bestFor: string[]
  notFor: string[]
  startHere: StartHereStep[]
  coveredTopics?: string[]
  notCoveredTopics?: string[]
  learningOutcomes?: string[]
  estimatedStudyTimeMinutes?: number
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  fitStatus: FitStatus
}
```

Add `learningFit?: LearningFit | null` to:

- resource query item/detail type
- tutorial query item/detail type
- collection query item/detail type
- create/update payloads.

### Shared Components

Create under `webapp/src/features/content/components/`:

#### `honest-fit-card.tsx`

Props:

```ts
interface HonestFitCardProps {
  fit?: LearningFit | null
  fallbackSummary?: string
  contentType: 'resource' | 'tutorial' | 'collection'
}
```

Render:

- Header: `Best for`
- List `bestFor`
- Header: `Not for`
- List `notFor`
- `StartHereSteps`
- Optional `VerifiedFitBadge`

Empty state:

- If no fit: do not render on public detail page, or render compact "Fit details coming soon" only in creator/dashboard context.

#### `start-here-steps.tsx`

Render ordered steps with target labels:

- Resource: file/chapter/topic/AI prompt.
- Tutorial: lesson/video step/resource step.
- Collection: phase/checkpoint.

#### `verified-fit-badge.tsx`

Render only when `fitStatus === 'VERIFIED'`.

Tooltip copy:

```txt
Verified Fit means this guidance has enough structured information to explain who this content is best for and how to start learning.
```

Phase 3 copy can mention evidence-backed extraction.

#### `content-receipt.tsx`

Render compact value summary:

- files/pages/videos count if available
- estimated study time
- covered topics
- last updated
- creator trust strip

#### `fit-editor.tsx`

Used in create/edit forms.

Fields:

- Best for list input
- Not for list input
- Start here ordered list
- Covered topics
- Not covered topics
- Learning outcomes
- Estimated study time
- Difficulty select

MVP behavior:

- Manual input only.
- Show helper copy: "Be specific. Honest fit improves buyer trust."
- Require at least one `Not for` if creator wants `Verified basic`.

### Resource MVP UI

Target page:

- `webapp/src/app/(private)/explore/resources/[id]/page.tsx`

Changes:

- Insert `HonestFitCard` near purchase CTA.
- Insert `ContentReceipt` above or near pricing.
- CTA microcopy:
  - default: `Buy & start review`
  - free item: `Start this study step`
  - already owned: `Continue learning`
- Public detail hierarchy:
  1. title/summary
  2. trust strip
  3. Honest Fit Card
  4. preview/document viewer
  5. content receipt
  6. creator section
  7. related content

### Tutorial Expansion UI

Target page:

- `webapp/src/app/(private)/explore/tutorials/[id]/page.tsx`

Changes:

- `HonestFitCard` near purchase CTA.
- `StartHereSteps` can map to tutorial `steps`.
- `What you will master` from `learningOutcomes`.
- CTA:
  - `Buy & start lesson 1`
  - `Start guided tutorial`
  - `Continue lesson`

### Collection As Learning Path UI

Target pages:

- `webapp/src/app/(private)/explore/resources/collections/[id]/page.tsx`
- `webapp/src/app/(private)/explore/tutorials/collections/[id]/page.tsx`

Changes:

- Reframe collection as `Learning Path`.
- Add `LearningPathOverview`.
- Render `phases` as checkpoints.
- `HonestFitCard` describes the whole path.
- CTA:
  - `Start this learning path`
  - `Continue path`

## Roadmap

### Phase 1: Resource MVP

Scope:

- backend `learningFit` schema/DTO for Resource only or shared schema added to all but UI used for resource first.
- frontend Resource detail `HonestFitCard`.
- resource create/edit `FitEditor`.
- basic `fitStatus = VERIFIED` when required fields exist.

Definition of Done:

- Creator can create/update resource with learning fit fields.
- Resource detail displays fit card.
- Existing resources without fit do not break.
- Purchase CTA can use fit-aware copy.
- Unit/component tests cover empty and populated fit states.

### Phase 2: Tutorial Expansion

Scope:

- tutorial create/edit accepts learning fit.
- tutorial detail renders fit card and maps `startHere` to tutorial steps.
- CTA changes to lesson-oriented copy.

Definition of Done:

- Tutorial detail shows `Best for`, `Not for`, `Start here`.
- Start steps can reference tutorial steps.
- Existing tutorial steps still render.

### Phase 3: Collection Learning Path

Scope:

- collection create/edit accepts learning fit.
- collection page renders path overview from existing `phases`.
- collection CTA becomes path-oriented.

Definition of Done:

- Collection page clearly shows estimated time, checkpoints, included content and start step.
- Collection fit card describes whole path.
- Existing collections without phases degrade gracefully.

### Phase 4: Evidence And AI Assist

Scope:

- generate fit draft from content extraction/RAG metadata.
- add `fitEvidence`.
- add statuses: `NEEDS_EVIDENCE`, `EXPIRED`.
- add backend validation for evidence-backed `VERIFIED`.

Definition of Done:

- AI suggestions can be generated for at least Resource.
- Claim without evidence cannot be marked evidence-backed verified.
- UI tooltip explains source of verification.

## Testing Plan

### Backend

- DTO validation tests:
  - accepts valid learning fit.
  - rejects too many items.
  - rejects empty strings.
  - cannot mark verified without required fields.
- Repository tests:
  - create/update persists `learningFit`.
  - old documents without `learningFit` map safely.
- Controller/e2e tests:
  - create resource with learningFit.
  - update resource learningFit.
  - fetch detail returns learningFit.

### Frontend

- Component tests:
  - `HonestFitCard` empty/null state.
  - `HonestFitCard` populated state.
  - `VerifiedFitBadge` only renders for `VERIFIED`.
  - `StartHereSteps` sorts by order.
- Form tests:
  - `FitEditor` add/remove/reorder step.
  - validation requires `bestFor`, `notFor`, `startHere` for verified basic.
- Page tests:
  - resource detail renders fit card when data exists.
  - resource detail still renders without fit.

### Integration/E2E

Critical path:

1. Creator creates resource with fit fields.
2. Student opens resource detail.
3. Student sees Best For / Not For / Start Here.
4. Student clicks purchase CTA.
5. After purchase, user lands in first recommended step or resource viewer.

## Analytics And Metrics

Add events:

- `fit_card_viewed`
- `fit_card_expanded`
- `start_here_clicked`
- `fit_cta_clicked`
- `fit_editor_completed`
- `verified_fit_published`

Compare:

- conversion on content with fit vs without fit.
- save rate before purchase.
- purchase CTA click rate.
- creator form completion rate.

## Open Questions

- Should `learningFit` be embedded in each document or normalized as a separate collection?
- Should `fitStatus` be creator-controlled for MVP or always computed by backend?
- Should `Not for` be mandatory for all paid content?
- How much of `Start Here` should be visible before purchase vs after purchase?
- Should AI preview be available for paid content before purchase, and what leakage guardrails are required?

## Recommended First Story

**Story:** Resource Honest Fit MVP

As a student, I want to see who a resource is best for, who it is not for, and what to do first after buying, so that I can decide whether to purchase without guessing.

Acceptance criteria:

- Resource model supports `learningFit`.
- Creator can add/edit fit fields for a resource.
- Resource detail page displays `HonestFitCard` near purchase CTA.
- Resource detail page displays fit-aware CTA copy.
- Existing resources without fit still render safely.
- Tests cover backend DTO mapping and frontend card rendering.
