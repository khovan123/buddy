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
  price: number
  label: string
  cta: string
  description: string
  yearlyPrice?: number
  badge?: string
}

export type PlanGroup = {
  title: string
  description: string
  iconKey: IconKey
  free: PlanTier
  pro: PlanTier & { yearlyPrice: number; badge: string }
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
      title: "Curated Resources",
      description:
        "Access thousands of tutorials, documents, and collections curated by students and creators who understand your learning journey.",
    },
    {
      iconKey: "Users",
      title: "Community-Driven",
      description:
        "Learn from peers who have been in your shoes. Our creators are students and professionals sharing real-world knowledge.",
    },
    {
      iconKey: "Sparkles",
      title: "AI-Powered Discovery",
      description:
        "Smart recommendations that match your major, career goals, and skills — so you always find the most relevant content.",
    },
    {
      iconKey: "TrendingUp",
      title: "Track Your Growth",
      description:
        "Monitor your learning progress, build your skill profile, and showcase your expertise to future employers.",
    },
  ],
  stats: [
    { value: "100K+", label: "Active Learners", iconKey: "Users" },
    { value: "2.5K+", label: "Expert Creators", iconKey: "GraduationCap" },
    { value: "150+", label: "Subject Areas", iconKey: "LayoutGrid" },
    { value: "4.9/5", label: "Satisfaction Rate", iconKey: "Star" },
  ],
  useCases: [
    {
      metric: "3X",
      metricLabel: "Faster learning outcomes",
      title: "Personalized learning paths that adapt to each student",
      description:
        "Students using Buddy complete their learning objectives 3 times faster than traditional methods, thanks to curated collections and AI-powered recommendations.",
    },
    {
      metric: "85%",
      metricLabel: "Content completion rate",
      title: "Engaging content that keeps students coming back",
      description:
        "Our community-curated approach ensures content quality and relevance, resulting in one of the highest completion rates in the industry.",
    },
    {
      metric: "50K+",
      metricLabel: "Resources shared monthly",
      title: "A thriving ecosystem of knowledge sharing",
      description:
        "Every month, creators contribute tutorials, resources and collections across 150+ subject areas, building the largest student-led learning library.",
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
/*  Pricing data fallback                                              */
/* ------------------------------------------------------------------ */

const PRICING_FALLBACK: PricingData = {
  creatorPlans: {
    title: "Creator",
    description: "Build your audience and monetize your expertise.",
    iconKey: "Palette",
    free: {
      price: 0,
      label: "Free",
      cta: "Start Creating",
      description: "Get started with essential creator tools.",
    },
    pro: {
      price: 9.99,
      yearlyPrice: 7.99,
      label: "Creator Pro",
      cta: "Upgrade to Pro",
      description: "Scale your content empire with unlimited power.",
      badge: "Most Popular",
    },
    features: [
      { label: "Storage", free: "500 MB", pro: "50 GB" },
      { label: "Resources", free: "Up to 5", pro: "Unlimited" },
      { label: "Tutorials", free: "Up to 3", pro: "Unlimited" },
      { label: "Collections", free: "Up to 2", pro: "Unlimited" },
      { label: "Analytics dashboard", free: true, pro: true },
      { label: "Advanced analytics", free: false, pro: true },
      { label: "Custom branding", free: false, pro: true },
      { label: "Priority review", free: false, pro: true },
      { label: "Discord support", free: false, pro: true },
      { label: "Revenue share", free: "85%", pro: "92%" },
    ],
  },
  studentPlans: {
    title: "Student",
    description: "Learn smarter with tools designed for students.",
    iconKey: "Users",
    free: {
      price: 0,
      label: "Free",
      cta: "Start Learning",
      description: "Access free resources and start your journey.",
    },
    pro: {
      price: 4.99,
      yearlyPrice: 3.99,
      label: "Student Pro",
      cta: "Upgrade to Pro",
      description: "Unlock the full learning experience.",
      badge: "Best Value",
    },
    features: [
      { label: "Storage", free: "1 GB", pro: "25 GB" },
      { label: "Data protection", free: false, pro: true },
      { label: "Collection discount", free: "—", pro: "15% off" },
      { label: "Content preview", free: "Standard", pro: "Extended" },
      { label: "Auto-review content", free: false, pro: true },
      { label: "Bookmark & organize", free: true, pro: true },
      { label: "Offline access", free: false, pro: true },
      { label: "Discord support", free: false, pro: true },
      { label: "Early access", free: false, pro: true },
      { label: "Ad-free experience", free: false, pro: true },
    ],
  },
  comparisonCategories: [
    {
      category: "Storage & Limits",
      rows: [
        {
          label: "Cloud storage",
          creatorFree: "500 MB",
          creatorPro: "50 GB",
          studentFree: "1 GB",
          studentPro: "25 GB",
        },
        {
          label: "Resource uploads",
          creatorFree: "5",
          creatorPro: "Unlimited",
          studentFree: "—",
          studentPro: "—",
        },
        {
          label: "Tutorial creation",
          creatorFree: "3",
          creatorPro: "Unlimited",
          studentFree: "—",
          studentPro: "—",
        },
        {
          label: "Collection creation",
          creatorFree: "2",
          creatorPro: "Unlimited",
          studentFree: "—",
          studentPro: "—",
        },
      ],
    },
    {
      category: "Content & Learning",
      rows: [
        {
          label: "Content preview",
          creatorFree: "Standard",
          creatorPro: "Extended",
          studentFree: "Standard",
          studentPro: "Extended",
        },
        {
          label: "Auto-review",
          creatorFree: false,
          creatorPro: true,
          studentFree: false,
          studentPro: true,
        },
        {
          label: "Data protection",
          creatorFree: false,
          creatorPro: false,
          studentFree: false,
          studentPro: true,
        },
        {
          label: "Collection discount",
          creatorFree: "—",
          creatorPro: "—",
          studentFree: "—",
          studentPro: "15% off",
        },
        {
          label: "Offline access",
          creatorFree: false,
          creatorPro: true,
          studentFree: false,
          studentPro: true,
        },
      ],
    },
    {
      category: "Support & Extras",
      rows: [
        {
          label: "Discord support",
          creatorFree: false,
          creatorPro: true,
          studentFree: false,
          studentPro: true,
        },
        {
          label: "Priority support",
          creatorFree: false,
          creatorPro: true,
          studentFree: false,
          studentPro: true,
        },
        {
          label: "Early access features",
          creatorFree: false,
          creatorPro: true,
          studentFree: false,
          studentPro: true,
        },
        {
          label: "Ad-free experience",
          creatorFree: true,
          creatorPro: true,
          studentFree: false,
          studentPro: true,
        },
        {
          label: "Custom branding",
          creatorFree: false,
          creatorPro: true,
          studentFree: "—",
          studentPro: "—",
        },
      ],
    },
  ],
  faqItems: [
    {
      q: "Can I switch between Creator and Student plans?",
      a: "Yes! You can have both a Creator and Student subscription simultaneously, or switch between them at any time from your account settings.",
    },
    {
      q: "What happens to my data if I downgrade?",
      a: "Your content remains accessible but you won't be able to create new content beyond the free tier limits. Existing content is never deleted.",
    },
    {
      q: "What does 'Data protection' mean for students?",
      a: "With Student Pro, if a creator deletes their resource, tutorial, or collection that you've purchased, your copy is preserved and remains accessible in your library.",
    },
    {
      q: "Is there a refund policy?",
      a: "Yes, we offer a 14-day money-back guarantee on all Pro plans. No questions asked.",
    },
    {
      q: "Do you offer discounts for groups or institutions?",
      a: "Absolutely! Contact us for custom pricing for universities, study groups, and educational institutions.",
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

export async function getPricingData(): Promise<PricingData> {
  return PRICING_FALLBACK
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
