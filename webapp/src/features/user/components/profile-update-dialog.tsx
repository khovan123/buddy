"use client"

import { useEffect, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { enUS } from "date-fns/locale"
import { CalendarIcon, CheckCircle2, Loader2 } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useGetContentMetaQuery } from "@/features/content/services/content-api"
import {
  useGetCareersQuery,
  useGetSkillsQuery,
  useUpdateMeMutation,
  type UserProfile,
} from "@/features/user/services/user-api"
import { cn } from "@/lib/utils"
import { useGlobalError } from "@/providers/error-provider"

import { profileUpdateSchema, ProfileUpdateValues } from "../schema"

/* ── Component ──────────────────────────────────────────────── */

interface ProfileUpdateDialogProps {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileUpdateDialog({
  user,
  open,
  onOpenChange,
}: ProfileUpdateDialogProps) {
  const { handleError, clearError } = useGlobalError()

  const { data: contentMetaRes } = useGetContentMetaQuery()
  const { data: careersRes } = useGetCareersQuery()
  const [updateMe, { isLoading }] = useUpdateMeMutation()
  const profile = user?.profile

  const [dobOpen, setDobOpen] = useState(false)

  const {
    register,
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      nickname: "",
      phone: "",
      bio: "",
      dateOfBirth: "",
      majorId: "",
      semester: undefined,
      careerId: "",
      skillIds: [],
    },
  })

  // Reset form when dialog opens with latest profile data
  useEffect(() => {
    if (open && profile) {
      reset({
        nickname: profile.nickname ?? "",
        phone: profile.phone ?? "",
        bio: profile.bio ?? "",
        dateOfBirth: profile.dateOfBirth
          ? profile.dateOfBirth.slice(0, 10)
          : "",
        majorId: profile.majorId ?? "",
        semester: profile.semester ?? undefined,
        careerId: profile.careerId ?? "",
        skillIds: profile.skillIds ?? [],
      })
    }
  }, [open, profile, reset])

  const selectedCareerId = useWatch({ control, name: "careerId" })
  const selectedSkills = useWatch({ control, name: "skillIds" }) || []
  const watchBio = useWatch({ control, name: "bio" })
  const watchMajorId = useWatch({ control, name: "majorId" })

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

  const onSubmit = async (data: ProfileUpdateValues) => {
    clearError()
    try {
      const payload: Record<string, unknown> = {}
      if (data.nickname) {
        payload.nickname = data.nickname
      }
      if (data.phone) {
        payload.phone = data.phone
      }
      if (data.bio) {
        payload.bio = data.bio
      }
      if (data.dateOfBirth) {
        payload.dateOfBirth = new Date(
          `${data.dateOfBirth}T00:00:00.000Z`
        ).toISOString()
      }
      if (data.majorId) {
        payload.majorId = data.majorId
      }
      if (data.semester != null) {
        payload.semester = data.semester
      }
      if (data.careerId) {
        payload.careerId = data.careerId
      }
      if (data.skillIds.length > 0) {
        payload.skillIds = data.skillIds
      }

      await updateMe(payload).unwrap()
      toast.success("Profile updated.")
      onOpenChange(false)
    } catch (err: unknown) {
      handleError(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Update Your Profile</DialogTitle>
          <DialogDescription>
            Keep your profile up to date for personalised recommendations and a
            better community experience.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          id="profile-update-form"
        >
          {/* ═══════════════ Personal Info ═══════════════ */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Personal Information
            </legend>

            {/* ── Nickname ─────────────────────────────── */}
            <Field>
              <Label htmlFor="profile-nickname">Nickname</Label>
              <Input
                id="profile-nickname"
                placeholder="How others see you"
                maxLength={100}
                {...register("nickname")}
              />
              {errors.nickname && (
                <p className="text-xs text-destructive">
                  {errors.nickname.message}
                </p>
              )}
            </Field>

            {/* ── Phone ────────────────────────────────── */}
            <Field>
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input
                id="profile-phone"
                type="tel"
                placeholder="+84 123 456 789"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </Field>

            {/* ── Date of Birth ────────────────────────── */}
            <Field>
              <Label>Date of Birth</Label>
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field }) => {
                  // Append generic time to force local timezone parsing to avoid backward day shifting
                  const dateValue = field.value
                    ? new Date(`${field.value}T12:00:00`)
                    : undefined

                  return (
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {dateValue ? (
                            dateValue.toLocaleDateString("en-US")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateValue}
                          defaultMonth={dateValue}
                          locale={enUS}
                          captionLayout="dropdown"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear()
                              const m = String(date.getMonth() + 1).padStart(
                                2,
                                "0"
                              )
                              const d = String(date.getDate()).padStart(2, "0")
                              field.onChange(`${y}-${m}-${d}`)
                            } else {
                              field.onChange("")
                            }
                            setDobOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )
                }}
              />
            </Field>

            {/* ── Bio ──────────────────────────────────── */}
            <Field>
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                placeholder="Tell others about yourself…"
                rows={3}
                maxLength={500}
                className="resize-none"
                {...register("bio")}
              />
              <p className="text-right text-xs text-muted-foreground">
                {watchBio?.length ?? 0}/500
              </p>
              {errors.bio && (
                <p className="text-xs text-destructive">{errors.bio.message}</p>
              )}
            </Field>
          </fieldset>

          <Separator />

          {/* ═══════════════ Academic & Career ═══════════════ */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Academic &amp; Career
            </legend>

            {/* ── Major + Semester (side by side) ─────── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="profile-update-major">Major</Label>
                <Select
                  value={watchMajorId}
                  onValueChange={(val) => setValue("majorId", val)}
                >
                  <SelectTrigger id="profile-major-select">
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
              </Field>

              <Field>
                <Label htmlFor="profile-semester">Semester</Label>
                <Input
                  id="profile-semester"
                  type="number"
                  min={1}
                  placeholder="e.g. 3"
                  {...register("semester", { valueAsNumber: true })}
                />
                {errors.semester && (
                  <p className="text-xs text-destructive">
                    {errors.semester.message}
                  </p>
                )}
              </Field>
            </div>

            {/* ── Career Goal ─────────────────────────── */}
            <Field>
              <Label htmlFor="profile-update-career">Career Goal</Label>
              <Select
                value={selectedCareerId}
                onValueChange={(val) => {
                  setValue("careerId", val)
                  setValue("skillIds", [])
                }}
              >
                <SelectTrigger id="profile-update-career">
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
            </Field>

            {/* ── Highlight Skills ────────────────────── */}
            {selectedCareerId && skills.length > 0 && (
              <Field>
                <Label>Highlight Skills</Label>
                <p className="text-xs text-muted-foreground">
                  Select the skills you want to showcase on your profile.
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill.id)
                    return (
                      <Badge
                        key={skill.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer gap-1 transition-all duration-200 hover:scale-105"
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
            )}
          </fieldset>
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form="profile-update-form"
            disabled={isLoading}
            id="profile-update-submit"
          >
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
