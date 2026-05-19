# Buddy MVP

This document defines the Minimum Viable Product for Buddy. It follows the MVP
guidance from ScrumPass: identify the core problem and customer, keep only the
most important features, release a usable version quickly, collect real
feedback, and measure whether the idea is worth deeper investment.

Reference: https://scrumpass.com/mvp-minimum-viable-product-la-gi-va-8-luu-y-khi-thiet-ke-mvp-cho-du-an/

## 1. Problem And Core Value

### Problem

Students often lose time searching across scattered course files, social posts,
creator pages, generic videos, and AI answers that are not grounded in the
actual study material. Creators also need a low-friction way to publish one
useful resource before committing to a full course catalogue.

### Core Value

Buddy helps a learner find course-specific material, study it, and get a
grounded next step from the content.

The MVP should validate one learning loop:

1. A learner discovers a relevant resource or tutorial.
2. The learner studies the material.
3. The learner asks or decides the next study step.
4. Buddy captures feedback or behavior that shows whether the loop is useful.

## 2. Target Users

### Primary Learner

- Student who needs a relevant resource, tutorial, or collection quickly.
- Has a practical study goal, such as preparing for an exam, reviewing a topic,
  or learning a skill for a project.
- Needs trusted course-specific guidance more than a large generic content feed.

### Primary Creator

- Student creator, mentor, teaching assistant, or instructor.
- Can publish one useful resource or tutorial without a full production setup.
- Wants early feedback before investing in a complete learning product.

## 3. MVP Feature Scope

The first version should focus on 1-3 core features that validate the value
proposition. Everything else is secondary.

### Feature 1: Discover Learning Content

Learners can browse or search existing resources, tutorials, and collections.

Minimum behavior:

- View available resources and tutorials.
- Open a content detail page.
- Understand what the material helps them learn.

Validated question:

- Can a learner find a relevant item in under 2 minutes?

### Feature 2: Publish One Useful Item

Creators can publish a first resource or tutorial.

Minimum behavior:

- Create a resource or tutorial with a title, description, course/topic context,
  and attached learning material or video.
- Make it available for learners to discover.

Validated question:

- Can a creator publish one useful item without onboarding help?

### Feature 3: Ask A Grounded Study Question

Learners can ask the AI study assistant questions based on the learning
material.

Minimum behavior:

- Ask a question about course or uploaded content.
- Receive a useful answer grounded in the material.
- Use the answer to decide the next study action.

Validated question:

- Does the answer reduce study friction compared with generic search or chat?

## 4. MVP Format

Buddy's MVP should be a working prototype, not a full marketplace.

Required release shape:

- Public landing page that explains the core value and routes users to the main
  learning flow.
- Authenticated app flow for exploring content, creating first content, and
  asking study questions.
- Manual or lightweight operational support is acceptable if it helps validate
  the idea faster.

Not required for MVP:

- Fully automated monetization.
- Institution-level admin workflows.
- Large recommendation model optimization.
- Full creator business tooling.

## 5. Feedback Collection

The MVP exists to learn from real users. Feedback should combine behavioral data
and direct qualitative input.

### Behavioral Signals

- Search or browse path used before opening a resource.
- Content detail views.
- Tutorial or resource completion intent.
- Saves, returns, or repeat visits.
- AI question count and follow-up question count.
- Creator publish completion rate.

### Qualitative Questions

- Which feature was most useful?
- What made the learning flow confusing or slow?
- What content was missing?
- Would you use this again for a real course?
- What should Buddy improve before adding more features?

## 6. Success Metrics

The MVP is successful if it proves that learners and creators value the core
loop enough to justify more investment.

### Learner Metrics

- At least 60% of test learners find a relevant item in under 2 minutes.
- At least 40% of test learners open a content detail page and take a next
  action, such as asking AI, saving, or continuing to another item.
- At least 30% of test learners return within 7 days.

### Creator Metrics

- At least 50% of invited creators publish one item.
- At least 70% of published items include enough context for learners to decide
  whether the material is useful.

### Feedback Metrics

- At least 10 early users provide qualitative feedback.
- The top 3 friction points are clear enough to rank the next iteration.

## 7. Deferred Scope

These features should not block the MVP release.

- Advanced subscriptions, payouts, wallet flows, and creator monetization.
- Institution dashboards, custom integrations, and enterprise reporting.
- Complex gamification, badges, social feeds, and referral systems.
- Large-scale recommendation training and personalization optimization.
- Full notification automation.
- Advanced analytics dashboards.
- Multi-role administration beyond what is needed to keep the test safe.

## 8. Next Iteration Rules

After the MVP release, new features should be prioritized only when they answer
one of these questions:

- Does this remove a validated learner friction point?
- Does this increase creator publishing quality or completion?
- Does this improve the core learning loop more than a simpler manual process?
- Does this produce measurable learning, retention, or conversion signal?

If the answer is no, the feature should remain outside the MVP roadmap.
