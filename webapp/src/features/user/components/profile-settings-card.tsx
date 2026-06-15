"use client"

import { useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, Pencil, Save } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGetContentMetaQuery } from "@/features/content/services/content-api"
import {
  useGetCareersQuery,
  useGetSkillsQuery,
  useUpdateMeMutation,
  type UserProfile,
} from "@/features/user/services/user-api"
import { useGlobalError } from "@/providers/error-provider"

const profileSettingsSchema = z.object({
  majorId: z.string().optional(),
  careerId: z.string().optional(),
  skillIds: z.array(z.string()),
})

type ProfileSettingsValues = z.infer<typeof profileSettingsSchema>

interface ProfileSettingsCardProps {
  user: UserProfile | null
}

export function ProfileSettingsCard({ user }: ProfileSettingsCardProps) {
  const [editing, setEditing] = useState(false)
  const { handleError, clearError } = useGlobalError()

  const { data: contentMetaRes } = useGetContentMetaQuery()
  const { data: careersRes } = useGetCareersQuery()
  const [updateMe, { isLoading }] = useUpdateMeMutation()

  const profile = user?.profile

  const { setValue, control, handleSubmit } = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    values: profile
      ? {
          majorId: profile.majorId ?? "",
          careerId: profile.careerId ?? "",
          skillIds: profile.skillIds ?? [],
        }
      : {
          majorId: "",
          careerId: "",
          skillIds: [],
        },
  })

  const selectedMajorId = useWatch({ control, name: "majorId" })
  const selectedCareerId = useWatch({ control, name: "careerId" })
  const selectedSkills = useWatch({ control, name: "skillIds" })

  const { data: skillsRes } = useGetSkillsQuery(
    selectedCareerId ? { careerId: selectedCareerId } : undefined,
    { skip: !selectedCareerId }
  )

  const majors = useMemo(
    () => contentMetaRes?.data?.majors ?? [],
    [contentMetaRes]
  )
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

  const currentMajor = majors.find((m) => m.id === profile?.majorId)
  const currentCareer = careers.find((c) => c.id === profile?.careerId)

  const onSubmit = async (data: ProfileSettingsValues) => {
    clearError()
    try {
      const payload: Record<string, unknown> = {}
      if (data.majorId) {
        payload.majorId = data.majorId
      }
      if (data.careerId) {
        payload.careerId = data.careerId
      }
      if (data.skillIds.length > 0) {
        payload.skillIds = data.skillIds
      }

      await updateMe(payload).unwrap()
      toast.success("Profile updated.")
      setEditing(false)
    } catch (err: unknown) {
      handleError(err)
    }
  }

  if (!profile) {
    return null
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Academic & Career Info
        </CardTitle>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1"
          >
            <Pencil className="size-3" />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing ? (
          /* ── View Mode ─────────────────────────────────── */
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Major
              </p>
              <p className="text-sm font-medium text-foreground">
                {currentMajor?.name ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Career Goal
              </p>
              <p className="text-sm font-medium text-foreground">
                {currentCareer?.name ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Highlight Skills
              </p>
              {profile.skillIds && profile.skillIds.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {profile.skillIds.map((sid) => {
                    const skill = skills.find((s) => s.id === sid)
                    return (
                      <Badge key={sid} variant="secondary" className="text-xs">
                        {skill?.name ?? sid}
                      </Badge>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>
          </div>
        ) : (
          /* ── Edit Mode ─────────────────────────────────── */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="profile-settings-major">Major</Label>
                <Select
                  value={selectedMajorId}
                  onValueChange={(val) => setValue("majorId", val)}
                >
                  <SelectTrigger id="profile-settings-major">
                    <SelectValue placeholder="Select major" />
                  </SelectTrigger>
                  <SelectContent>
                    {majors.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="profile-settings-career">Career Goal</Label>
                <Select
                  value={selectedCareerId}
                  onValueChange={(val) => {
                    setValue("careerId", val)
                    setValue("skillIds", [])
                  }}
                >
                  <SelectTrigger id="profile-settings-career">
                    <SelectValue placeholder="Select career" />
                  </SelectTrigger>
                  <SelectContent>
                    {careers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {selectedCareerId && skills.length > 0 ? (
              <Field>
                <Label>Highlight Skills</Label>
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
              </Field>
            ) : null}

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Save className="mr-1 size-3" />
                )}
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false)
                  clearError()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
