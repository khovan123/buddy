import type {
  ContentResourceItem,
  ContentTutorialItem,
} from "@/features/dashboard/services/dashboard.service"
import {
  getCareers,
  getContentMeta,
  getMyResources,
  getMyTutorials,
  getSkills,
} from "@/features/dashboard/services/dashboard.service"
import {
  CareerItem,
  Course,
  Major,
  SkillItem,
} from "@/features/dashboard/types"
import type { SeoContent } from "@/features/seo/services/seo-content"

import { CollectionsDashboard } from "./dashboards/collections-dashboard"
import { ResourcesDashboard } from "./dashboards/resources-dashboard"
import { TutorialsDashboard } from "./dashboards/tutorials-dashboard"
import CareersTable from "./tables/careers-table"
import CoursesTable from "./tables/courses-table"
import MajorsTable from "./tables/majors-table"
import SkillsTable from "./tables/skills-table"

export default async function ContentDashboardView({
  seo,
  slug,
}: {
  seo: SeoContent
  slug: string
}) {
  const isContentPage = ["tutorials", "resources", "collections"].includes(slug)
  let majors: Major[] = []
  let courses: Course[] = []
  let careers: CareerItem[] = []
  let skills: SkillItem[] = []
  let tutorials: ContentTutorialItem[] = []
  let resources: ContentResourceItem[] = []

  if (!isContentPage) {
    const [metaRes, careersRes, skillsRes] = await Promise.all([
      getContentMeta(),
      getCareers(),
      getSkills(),
    ])
    majors = metaRes?.majors || []
    courses = metaRes?.courses || []
    careers = careersRes || []
    skills = skillsRes || []
  } else {
    if (slug === "tutorials") {
      const resp = await getMyTutorials()
      tutorials = (resp as ContentTutorialItem[]) || []
    } else if (slug === "resources") {
      const resp = await getMyResources()
      resources = (resp as ContentResourceItem[]) || []
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {!isContentPage && (
        <header className="mb-8 space-y-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {seo.badge}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {seo.title}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {seo.description}
          </p>
        </header>
      )}

      <div className="pb-8">
        {slug === "majors" && <MajorsTable majors={majors} />}
        {slug === "courses" && (
          <CoursesTable courses={courses} majors={majors} />
        )}
        {slug === "careers" && <CareersTable careers={careers} />}
        {slug === "skills" && <SkillsTable skills={skills} careers={careers} />}
        {slug === "tutorials" && <TutorialsDashboard tutorials={tutorials} />}
        {slug === "resources" && <ResourcesDashboard resources={resources} />}
        {slug === "collections" && <CollectionsDashboard />}
      </div>
    </div>
  )
}
