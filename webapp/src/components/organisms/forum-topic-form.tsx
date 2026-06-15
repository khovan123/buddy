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
  forumTopicSchema,
  type ForumTopicFormValues,
} from "@/features/forum/schema"

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
  const [majorSearch, setMajorSearch] = useState("")
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
  const selectedMajorName = selectedMajor?.name ?? "Select major tag"
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
          <h2 className="text-sm font-semibold">New topic</h2>
          <p className="text-xs text-muted-foreground">
            Pick a major tag before posting.
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
              aria-label="Topic major tag"
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
        placeholder="Topic title"
        aria-label="Topic title"
        {...register("title")}
      />
      {errors.title ? (
        <p className="text-xs text-destructive">{errors.title.message}</p>
      ) : null}
      <Textarea
        placeholder="What do you want to discuss?"
        aria-label="Topic body"
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
        Post topic
      </Button>
    </form>
  )
}
