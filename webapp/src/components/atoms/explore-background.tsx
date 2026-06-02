import { EducationUniverse } from "@/components/atoms/education-universe"

export function ExploreBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden opacity-40">
      <EducationUniverse variant="ambient" />
    </div>
  )
}
