"use client"

import { useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createForumTopicSchema,
  type ForumTopicFormValues,
} from "@/features/forum/schema"
import { useI18n } from "@/i18n/language-provider"

type ForumTopicMajor = {
  id: string
  name: string
  code: string
}

export function ForumTopicForm({
  majors,
  onSubmit,
}: {
  majors: ForumTopicMajor[]
  onSubmit: (values: ForumTopicFormValues) => Promise<boolean | void>
}) {
  const { t } = useI18n()
  const [majorSearch, setMajorSearch] = useState("")
  const forumTopicSchema = useMemo(
    () => createForumTopicSchema((key) => t(key as never)),
    [t]
  )
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForumTopicFormValues>({
    resolver: zodResolver(forumTopicSchema),
    defaultValues: {
      majorId: "",
      title: "",
      excerpt: "",
    },
  })

  const majorId = useWatch({ control, name: "majorId" })
  const selectedMajor = majors.find((major) => major.id === majorId)
  const selectedMajorName =
    selectedMajor?.name ?? t("forum.form.majorPlaceholder")
  const visibleMajors = useMemo(() => {
    const query = majorSearch.trim().toLowerCase()

    if (!query) {
      return majors
    }

    return majors.filter((major) =>
      [major.name, major.code].join(" ").toLowerCase().includes(query)
    )
  }, [majors, majorSearch])

  async function submit(values: ForumTopicFormValues) {
    const didSubmit = await onSubmit(values)

    if (didSubmit !== false) {
      reset()
      setMajorSearch("")
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="space-y-4 rounded-xl border border-border/75 bg-background/68 p-4"
    >
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Plus className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("forum.form.title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("forum.form.description")}
          </p>
        </div>
      </div>
      <Controller
        name="majorId"
        control={control}
        render={({ field }) => (
          <Combobox
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value ?? "")
              setMajorSearch("")
            }}
            inputValue={majorSearch}
            onInputValueChange={(value, details) => {
              if (
                details?.reason === "input-change" ||
                details?.reason === "input-clear"
              ) {
                setMajorSearch(value)
              }
            }}
          >
            <ComboboxInput
              aria-label={t("forum.form.majorAriaLabel")}
              placeholder={selectedMajorName}
              className="w-full"
              onBlur={() => {
                field.onBlur()
                setMajorSearch("")
              }}
            />
            <ComboboxContent className="rounded-xl">
              {/* <ComboboxEmpty>No major found.</ComboboxEmpty> */}
              <ComboboxList>
                {visibleMajors.map((major) => (
                  <ComboboxItem
                    key={major.id}
                    value={major.id}
                    className="rounded-lg"
                  >
                    {major.name}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      />
      {errors.majorId ? (
        <p className="text-xs text-destructive">{errors.majorId.message}</p>
      ) : null}
      <Input
        placeholder={t("forum.form.titlePlaceholder")}
        aria-label={t("forum.form.titleAriaLabel")}
        {...register("title")}
      />
      {errors.title ? (
        <p className="text-xs text-destructive">{errors.title.message}</p>
      ) : null}
      <Textarea
        placeholder={t("forum.form.bodyPlaceholder")}
        aria-label={t("forum.form.bodyAriaLabel")}
        className="min-h-28 rounded-xl"
        {...register("excerpt")}
      />
      {errors.excerpt ? (
        <p className="text-xs text-destructive">{errors.excerpt.message}</p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={!majorId || isSubmitting}
      >
        <Plus className="size-4" />
        {t("forum.form.submit")}
      </Button>
    </form>
  )
}
