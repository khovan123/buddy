import { fetchApi } from "@/lib/fetch"
import type { ApiResponse } from "@/types/api"

/* ------------------------------------------------------------------ */
/*  Icon key type — serializable identifier for Lucide icons           */
/* ------------------------------------------------------------------ */

export type IconKey =
  | "BookOpen"
  | "FolderOpen"
  | "GraduationCap"
  | "Globe"
  | "Heart"
  | "LayoutGrid"
  | "Lightbulb"
  | "MapPin"
  | "Palette"
  | "Shield"
  | "Sparkles"
  | "Star"
  | "Target"
  | "TrendingUp"
  | "Users"

/* ------------------------------------------------------------------ */
/*  Landing page types                                                 */
/* ------------------------------------------------------------------ */

export type LandingFeature = {
  iconKey: IconKey
  title: string
  description: string
}

export type LandingStat = {
  value: string
  label: string
  iconKey: IconKey
}

export type LandingUseCase = {
  metric: string
  metricLabel: string
  title: string
  description: string
}

export type LandingTestimonial = {
  name: string
  role: string
  quote: string
  rating: number
}

export type LandingData = {
  features: LandingFeature[]
  stats: LandingStat[]
  useCases: LandingUseCase[]
  testimonials: LandingTestimonial[]
}

/* ------------------------------------------------------------------ */
/*  About page types                                                   */
/* ------------------------------------------------------------------ */

export type AboutValue = {
  iconKey: IconKey
  title: string
  description: string
}

export type AboutTeamMember = {
  name: string
  role: string
  bio: string
}

export type AboutAdvisor = {
  name: string
  role: string
}

export type AboutMilestone = {
  year: string
  event: string
}

export type AboutOffice = {
  city: string
  address: string
  label: string
}

export type AboutData = {
  values: AboutValue[]
  team: AboutTeamMember[]
  advisors: AboutAdvisor[]
  milestones: AboutMilestone[]
  offices: AboutOffice[]
}

/* ------------------------------------------------------------------ */
/*  Pricing page types                                                 */
/* ------------------------------------------------------------------ */

export type PlanFeature = {
  label: string
  free: string | boolean
  pro: string | boolean
}

export type PlanTier = {
  monthlyPriceCents: number
  priceInCents: number
  currency: string
  label: string
  cta: string
  description: string
  yearlyMonthlyPriceCents?: number
  badge?: string
}

export type PlanGroup = {
  title: string
  description: string
  iconKey: IconKey
  free: PlanTier
  pro: PlanTier & { yearlyMonthlyPriceCents: number; badge: string }
  features: PlanFeature[]
}

export type ComparisonRow = {
  label: string
  creatorFree: string | boolean
  creatorPro: string | boolean
  studentFree: string | boolean
  studentPro: string | boolean
}

export type ComparisonCategory = {
  category: string
  rows: ComparisonRow[]
}

export type FaqItem = {
  q: string
  a: string
}

export type PricingData = {
  creatorPlans: PlanGroup
  studentPlans: PlanGroup
  comparisonCategories: ComparisonCategory[]
  faqItems: FaqItem[]
}

/* ------------------------------------------------------------------ */
/*  Landing data fallback                                              */
/* ------------------------------------------------------------------ */

const LANDING_FALLBACK: LandingData = {
  features: [
    {
      iconKey: "BookOpen",
      title: "Focused course resources",
      description:
        "Start with a small, useful library of notes, documents, and tutorials organized around the learner's immediate study goal.",
    },
    {
      iconKey: "Users",
      title: "Creator-first publishing",
      description:
        "Let a student or mentor publish one practical resource quickly, then improve the format from real learner feedback.",
    },
    {
      iconKey: "Sparkles",
      title: "Grounded study assistant",
      description:
        "Answer questions from the learning material itself so students get a clearer next step instead of generic advice.",
    },
    {
      iconKey: "TrendingUp",
      title: "Learning signals",
      description:
        "Track whether learners find content, finish a resource, ask follow-up questions, and come back for the next session.",
    },
  ],
  stats: [
    {
      value: "3",
      label: "Core actions in the first release",
      iconKey: "Target",
    },
    {
      value: "1",
      label: "Creator upload needed to test supply",
      iconKey: "GraduationCap",
    },
    {
      value: "7d",
      label: "Feedback cycle before the next iteration",
      iconKey: "TrendingUp",
    },
  ],
  useCases: [
    {
      metric: "1",
      metricLabel: "Primary user journey",
      title: "A learner finds material and gets a useful next step",
      description:
        "The first Buddy release should prove one loop: a learner discovers relevant course material, studies it, and uses the assistant or creator context to decide what to do next.",
    },
    {
      metric: "3",
      metricLabel: "Validation questions",
      title: "Measure behavior before expanding the roadmap",
      description:
        "The MVP measures discovery speed, first creator upload completion, and whether grounded AI answers reduce study friction.",
    },
    {
      metric: "4",
      metricLabel: "Deferred categories",
      title: "Delay expensive features until demand is clearer",
      description:
        "Payments, institutional dashboards, advanced recommendations, and social mechanics should follow validated learner and creator usage.",
    },
  ],
  testimonials: [
    {
      name: "Minh Nguyen",
      role: "Computer Science, VNU",
      quote:
        "Buddy completely changed how I study. The curated collections for my major saved me hundreds of hours of searching.",
      rating: 5,
    },
    {
      name: "Sarah Chen",
      role: "Creator, 8K+ Students",
      quote:
        "As a creator, Buddy gave me the tools to share my knowledge with thousands. The analytics help me understand what content works best.",
      rating: 5,
    },
    {
      name: "David Park",
      role: "Business Administration, SNU",
      quote:
        "The AI recommendations are scarily accurate. It suggests exactly what I need to study next for my career goals.",
      rating: 5,
    },
  ],
}

/* ------------------------------------------------------------------ */
/*  About data fallback                                                */
/* ------------------------------------------------------------------ */

const ABOUT_FALLBACK: AboutData = {
  values: [
    {
      iconKey: "Heart",
      title: "Community First",
      description:
        "Every decision starts with our learners and creators. We build tools that empower individuals, not institutions.",
    },
    {
      iconKey: "Lightbulb",
      title: "Knowledge Should Be Accessible",
      description:
        "Great learning resources shouldn't be locked behind paywalls. We make quality education affordable and discoverable for everyone.",
    },
    {
      iconKey: "Shield",
      title: "Trust & Quality",
      description:
        "Our community-driven review system ensures every resource meets a high standard. Quality is never compromised.",
    },
    {
      iconKey: "Target",
      title: "Measurable Impact",
      description:
        "We obsess over learning outcomes, not vanity metrics. Every feature we build is designed to drive real educational progress.",
    },
  ],
  team: [
    {
      name: "Minh Pham",
      role: "Founder & CEO",
      bio: "Former CS student at VNU who saw the gap between scattered resources and real learning outcomes.",
    },
    {
      name: "Sarah Chen",
      role: "Head of Product",
      bio: "Ex-Coursera product lead, passionate about making educational tools that students actually love to use.",
    },
    {
      name: "David Park",
      role: "Head of Engineering",
      bio: "Previously at Google Education. Believes great infrastructure is the foundation of great learning.",
    },
    {
      name: "Linh Tran",
      role: "Head of Community",
      bio: "Built creator programs at top ed-tech companies. Knows how to nurture a thriving knowledge ecosystem.",
    },
    {
      name: "Alex Kim",
      role: "Head of AI & Data",
      bio: "ML researcher turned builder. Focused on making content discovery genuinely intelligent.",
    },
    {
      name: "Emma Wilson",
      role: "Head of Design",
      bio: "Award-winning UX designer who believes learning platforms should feel as intuitive as consumer apps.",
    },
  ],
  advisors: [
    { name: "Prof. Nguyen Van An", role: "Dean of CS, VNU" },
    { name: "Dr. James Liu", role: "Former VP Education, Google" },
    { name: "Maria Santos", role: "Founder, EduVentures Capital" },
    { name: "Thomas Berg", role: "CTO, Nordic EdTech" },
  ],
  milestones: [
    { year: "2023", event: "Buddy founded as a university project at VNU" },
    { year: "2023", event: "First 1,000 students joined the platform" },
    {
      year: "2024",
      event: "Launched creator monetization — 500 creators onboarded",
    },
    { year: "2024", event: "AI-powered recommendations engine shipped" },
    {
      year: "2025",
      event: "Crossed 100K active learners across 50+ universities",
    },
    { year: "2025", event: "Series A funding — expanding to Southeast Asia" },
  ],
  offices: [
    {
      city: "Ho Chi Minh City",
      address: "District 1, Ho Chi Minh City, Vietnam",
      label: "Headquarters",
    },
    {
      city: "Hanoi",
      address: "Cau Giay District, Hanoi, Vietnam",
      label: "Engineering Hub",
    },
  ],
}

/* ------------------------------------------------------------------ */
/*  Service functions (async — ready for future API integration)       */
/* ------------------------------------------------------------------ */

export async function getLandingData(): Promise<LandingData> {
  return LANDING_FALLBACK
}

export async function getAboutData(): Promise<AboutData> {
  return ABOUT_FALLBACK
}

export async function getPricingData(): Promise<PricingData | null> {
  try {
    const response = await fetchApi("GET", "/billing/subscription/plans")

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as ApiResponse<PricingData>
    return payload.data ?? null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  How it works types & fallback                                      */
/* ------------------------------------------------------------------ */

export type HowItWorksStep = {
  id: string
  title: string
  description: string
  iconKey: IconKey
}

export type HowItWorksData = {
  learnerSteps: HowItWorksStep[]
  creatorSteps: HowItWorksStep[]
}

const HOW_IT_WORKS_FALLBACK: HowItWorksData = {
  learnerSteps: [
    {
      id: "search",
      title: "Search & Discover",
      description:
        "Find the exact study material you need using our AI-powered search across 150+ subject areas.",
      iconKey: "LayoutGrid",
    },
    {
      id: "learn",
      title: "Learn from Peers",
      description:
        "Access curated notes, dynamic tutorials, and comprehensive collections from top students who have mastered the material.",
      iconKey: "BookOpen",
    },
    {
      id: "organize",
      title: "Build your Library",
      description:
        "Save, bookmark, and organize materials into personalized study paths for quick access during exam seasons.",
      iconKey: "FolderOpen",
    },
  ],
  creatorSteps: [
    {
      id: "create",
      title: "Become a Creator",
      description:
        "Upload your own high-quality resources, write tutorials, and package them into collections.",
      iconKey: "Palette",
    },
    {
      id: "earn",
      title: "Earn while you learn",
      description:
        "Get paid automatically when students purchase or subscribe to your premium content.",
      iconKey: "TrendingUp",
    },
    {
      id: "impact",
      title: "Track your Impact",
      description:
        "Use your dashboard to see how many students you've helped and optimize your content strategy.",
      iconKey: "Target",
    },
  ],
}

export async function getHowItWorksData(): Promise<HowItWorksData> {
  return HOW_IT_WORKS_FALLBACK
}

/* ------------------------------------------------------------------ */
/*  FAQ types & fallback                                               */
/* ------------------------------------------------------------------ */

export type FaqCategoryItem = {
  id: string
  title: string
  faqs: FaqItem[]
}

export type FaqData = {
  categories: FaqCategoryItem[]
}

const FAQ_FALLBACK: FaqData = {
  categories: [
    {
      id: "general",
      title: "General",
      faqs: [
        {
          q: "What is Buddy?",
          a: "Buddy is a student-led educational marketplace that connects learners with curated resources, tutorials, and expert-created collections across hundreds of academic and professional fields.",
        },
        {
          q: "Is it free to join?",
          a: "Yes! Creating an account is completely free. We offer free access to many resources, alongside premium content created by our top creators.",
        },
      ],
    },
    {
      id: "creators",
      title: "For Creators",
      faqs: [
        {
          q: "How do I become a creator?",
          a: "Anyone can become a creator. Simply sign up, verify your academic or professional credentials in your profile settings, and start uploading your resources in the Creator Dashboard.",
        },
        {
          q: "How much do creators earn?",
          a: "Creators earn a generous revenue share on all their premium resources and subscriptions. Free tier creators earn 85%, while Creator Pro members earn up to 92% of all sales.",
        },
        {
          q: "What kind of content can I sell?",
          a: "You can sell study guides, comprehensive tutorials, digital flashcards, templates, and full study collections. All content must adhere to our academic integrity policy.",
        },
      ],
    },
    {
      id: "students",
      title: "For Students",
      faqs: [
        {
          q: "How do I know the resources are good?",
          a: "Our community uses a rigorous rating and review system. Furthermore, all Pro tools are vetted through our auto-review mechanisms, ensuring quality and accuracy.",
        },
        {
          q: "Can I get a refund if the material wasn't helpful?",
          a: "Yes. We offer a 14-day money-back guarantee for individual resource purchases if the material does not match its description or quality standards.",
        },
      ],
    },
  ],
}

export async function getFaqPageData(): Promise<FaqData> {
  return FAQ_FALLBACK
}
