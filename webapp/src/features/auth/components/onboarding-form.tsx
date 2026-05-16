"use client"

import { useMemo } from "react"

import { useRouter } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { SectionHeading } from "@/components/atoms/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useGetContentMetaQuery,
  useGetCoursesByMajorQuery,
} from "@/features/content/services/content-api"
import {
  useGetCareersQuery,
  useGetSkillsQuery,
  useUpdateMeMutation,
} from "@/features/user/services/user-api"
import { useGlobalError } from "@/providers/error-provider"

const onboardingSchema = z.object({
  majorId: z.string().min(1, "Please select your major"),
  courseId: z.string().min(1, "Please select your course"),
  careerId: z.string().min(1, "Please select your career goal"),
  skillIds: z
    .array(z.string())
    .min(1, "Please select at least one highlight skill"),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
  const router = useRouter()
  const { handleError, clearError } = useGlobalError()

  const { data: contentMetaRes } = useGetContentMetaQuery()
  const { data: careersRes } = useGetCareersQuery()
  const [updateMe, { isLoading }] = useUpdateMeMutation()

  const {
    setValue,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { majorId: "", courseId: "", careerId: "", skillIds: [] },
  })

  const selectedMajorId = useWatch({ control, name: "majorId" })
  const selectedCareerId = useWatch({ control, name: "careerId" })
  const selectedSkills = useWatch({ control, name: "skillIds" })

  const { data: coursesRes } = useGetCoursesByMajorQuery(
    selectedMajorId || "",
    { skip: !selectedMajorId }
  )

  const { data: skillsRes } = useGetSkillsQuery(
    selectedCareerId ? { careerId: selectedCareerId } : undefined,
    { skip: !selectedCareerId }
  )

  const majors = useMemo(
    () => contentMetaRes?.data?.majors ?? [],
    [contentMetaRes]
  )
  const courses = useMemo(() => coursesRes?.data ?? [], [coursesRes])
  const careers = useMemo(() => careersRes?.data?.data ?? [], [careersRes])
  const skills = useMemo(() => skillsRes?.data?.data ?? [], [skillsRes])

  const toggleSkill = (id: string) => {
    const current = selectedSkills
    if (current.includes(id)) {
      setValue(
        "skillIds",
        current.filter((s) => s !== id)
      )
    } else {
      setValue("skillIds", [...current, id])
    }
  }

  const onSubmit = async (data: OnboardingFormValues) => {
    clearError()
    try {
      await updateMe(data).unwrap()
      router.push("/home")
    } catch (err: unknown) {
      handleError(err)
    }
  }

  return (
    <section className="space-y-6">
      <SectionHeading
        badge="Onboarding"
        title="Complete Your Profile"
        description="Help us personalize your experience. Tell us about your major, career goal, and key skills."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-6">
          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="sr-only">
              Profile details
            </FieldLegend>

            {/* Major */}
            <Field>
              <FieldLabel htmlFor="majorId">Your Major</FieldLabel>
              <Select
                onValueChange={(val) => {
                  setValue("majorId", val)
                  setValue("courseId", "")
                }}
              >
                <SelectTrigger id="majorId">
                  <SelectValue placeholder="Select your major" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.majorId ? (
                <p className="text-sm text-destructive">
                  {errors.majorId.message}
                </p>
              ) : (
                <FieldDescription>
                  Your field of study at university.
                </FieldDescription>
              )}
            </Field>

            {/* Course */}
            <Field>
              <FieldLabel htmlFor="courseId">Your Course</FieldLabel>
              <Select onValueChange={(val) => setValue("courseId", val)}>
                <SelectTrigger id="courseId" disabled={!selectedMajorId}>
                  <SelectValue placeholder="Select your course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.courseId ? (
                <p className="text-sm text-destructive">
                  {errors.courseId.message}
                </p>
              ) : (
                <FieldDescription>
                  Your specific course program.
                </FieldDescription>
              )}
            </Field>

            {/* Career */}
            <Field>
              <FieldLabel htmlFor="careerId">Career Goal</FieldLabel>
              <Select
                onValueChange={(val) => {
                  setValue("careerId", val)
                  setValue("skillIds", [])
                }}
              >
                <SelectTrigger id="careerId">
                  <SelectValue placeholder="Select your career goal" />
                </SelectTrigger>
                <SelectContent>
                  {careers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.careerId ? (
                <p className="text-sm text-destructive">
                  {errors.careerId.message}
                </p>
              ) : (
                <FieldDescription>
                  Your target career after graduation.
                </FieldDescription>
              )}
            </Field>

            {/* Skills */}
            <Field>
              <FieldLabel>Highlight Skills</FieldLabel>
              {selectedCareerId ? (
                skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.id)
                      return (
                        <Badge
                          key={skill.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer gap-1 transition-colors"
                          onClick={() => toggleSkill(skill.id)}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="size-3" />
                          ) : null}
                          {skill.name}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No skills available for this career yet.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a career goal first to see available skills.
                </p>
              )}
              {errors.skillIds ? (
                <p className="text-sm text-destructive">
                  {errors.skillIds.message}
                </p>
              ) : null}
            </Field>
          </FieldSet>

          <div className="flex items-center gap-3">
            <Button className="flex-1" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/home")}
            >
              Skip for now
            </Button>
          </div>
        </FieldGroup>
      </form>
    </section>
  )
}
