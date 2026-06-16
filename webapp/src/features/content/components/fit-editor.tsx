"use client"

import { Plus, Trash2 } from "lucide-react"
import {
  type Control,
  type FieldValues,
  type Path,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
} from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useGenerateLearningFitDraftMutation } from "@/features/content/services/content-api"
import type { GenerateLearningFitDraftPayload } from "@/features/content/types"
import { toLearningFitFormValues } from "@/features/content/utils/learning-fit"

interface FitEditorProps<T extends FieldValues> {
  control: Control<T>
  register: UseFormRegister<T>
  setValue: UseFormSetValue<T>
  fieldPrefix?: string
  draftContext?: GenerateLearningFitDraftPayload
}

function path<T extends FieldValues>(prefix: string, name: string) {
  return `${prefix}.${name}` as Path<T>
}

function ListEditor<T extends FieldValues>({
  control,
  register,
  title,
  description,
  name,
  placeholder,
}: {
  control: Control<T>
  register: UseFormRegister<T>
  title: string
  description: string
  name: Path<T>
  placeholder: string
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as never,
  })

  return (
    <div className="space-y-2">
      <div>
        <Label>{title}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...register(`${name}.${index}.value` as Path<T>)}
              placeholder={placeholder}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => remove(index)}
              aria-label={`Remove ${title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => append({ value: "" } as never)}
      >
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </div>
  )
}

export function FitEditor<T extends FieldValues>({
  control,
  register,
  setValue,
  fieldPrefix = "learningFit",
  draftContext,
}: FitEditorProps<T>) {
  const prefix = fieldPrefix
  const [generateDraft, { isLoading: isGeneratingDraft }] =
    useGenerateLearningFitDraftMutation()
  const startHereName = path<T>(prefix, "startHere")
  const { fields, append, remove } = useFieldArray({
    control,
    name: startHereName as never,
  })

  const canGenerateDraft = Boolean(draftContext?.title?.trim())

  const handleGenerateDraft = async () => {
    if (!draftContext || !canGenerateDraft) {
      toast.error("Add a title before generating an Honest Fit draft.")
      return
    }

    try {
      const result = await generateDraft(draftContext).unwrap()
      setValue(
        fieldPrefix as Path<T>,
        toLearningFitFormValues(result.learningFit) as never,
        { shouldDirty: true, shouldValidate: true }
      )
      toast.success(
        result.fallbackUsed
          ? "Generated a basic Honest Fit draft from your metadata."
          : "Generated an AI Honest Fit draft."
      )
    } catch {
      toast.error("We could not generate a fit draft right now.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Honest Fit</CardTitle>
            <CardDescription>
              Be specific about who this content helps, who it does not help,
              and what learners should do first after buying.
            </CardDescription>
          </div>
          {draftContext ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleGenerateDraft()}
              disabled={isGeneratingDraft || !canGenerateDraft}
            >
              {isGeneratingDraft ? "Generating..." : "Generate draft"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <ListEditor
            control={control}
            register={register}
            title="Best for"
            description="Who should buy this?"
            name={path<T>(prefix, "bestFor")}
            placeholder="Students reviewing derivatives before midterm"
          />
          <ListEditor
            control={control}
            register={register}
            title="Not for"
            description="Who should skip this?"
            name={path<T>(prefix, "notFor")}
            placeholder="Students looking for full past exam solutions"
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label>Start here</Label>
            <p className="text-xs text-muted-foreground">
              Give learners a concrete first sequence after purchase.
            </p>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-lg border p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_96px_auto]">
                <Input
                  {...register(`${startHereName}.${index}.title` as Path<T>)}
                  placeholder="Skim the concept recap"
                />
                <Input
                  type="number"
                  min={1}
                  {...register(`${startHereName}.${index}.order` as Path<T>, {
                    valueAsNumber: true,
                  })}
                  placeholder="Order"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label="Remove start step"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                {...register(
                  `${startHereName}.${index}.description` as Path<T>
                )}
                rows={2}
                placeholder="Practice the worked examples, then ask Buddy AI to quiz you."
              />
              <Input
                {...register(`${startHereName}.${index}.aiPrompt` as Path<T>)}
                placeholder='Optional AI prompt, e.g. "Quiz me on common mistakes"'
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              append({
                title: "",
                description: "",
                order: fields.length + 1,
                targetType: "AI_PROMPT",
                aiPrompt: "",
              } as never)
            }
          >
            <Plus className="h-4 w-4" />
            Add start step
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ListEditor
            control={control}
            register={register}
            title="Covered topics"
            description="Topics learners can expect."
            name={path<T>(prefix, "coveredTopics")}
            placeholder="Derivative rules"
          />
          <ListEditor
            control={control}
            register={register}
            title="Not covered"
            description="Useful honest exclusions."
            name={path<T>(prefix, "notCoveredTopics")}
            placeholder="Full past exam solutions"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Estimated study time</Label>
            <Input
              type="number"
              min={1}
              placeholder="45"
              {...register(path<T>(prefix, "estimatedStudyTimeMinutes"), {
                valueAsNumber: true,
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select
              onValueChange={(value) =>
                setValue(path<T>(prefix, "difficulty"), value as never)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BEGINNER">Beginner</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                <SelectItem value="ADVANCED">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
