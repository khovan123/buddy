"use client"

import { type FormEvent, type ReactElement, useState } from "react"

import { CloudUpload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type OpenTicketDialogProps = {
  trigger: ReactElement
}

export function OpenTicketDialog({ trigger }: OpenTicketDialogProps) {
  const [open, setOpen] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-3xl! rounded-2xl p-0 sm:max-h-[90vh] sm:overflow-y-auto">
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-primary/10" />

          <DialogHeader className="relative z-10 space-y-2 pr-8">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Open a Support Ticket
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Can&apos;t find what you need? Our creators can build it for you,
              or our team can help with issues.
            </DialogDescription>
          </DialogHeader>

          <form className="relative z-10 mt-8" onSubmit={handleSubmit}>
            <FieldGroup className="gap-6">
              <FieldSet className="gap-6">
                <FieldLegend variant="label" className="sr-only">
                  Ticket details
                </FieldLegend>

                <Field>
                  <FieldLabel htmlFor="ticket-subject">
                    Ticket Subject
                  </FieldLabel>
                  <Input
                    id="ticket-subject"
                    name="subject"
                    required
                    className="h-11 rounded-xl"
                    placeholder="e.g., Request for Advanced Physics Notes"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="ticket-category">Category</FieldLabel>
                    <Select defaultValue="resource-request" name="category">
                      <SelectTrigger
                        id="ticket-category"
                        className="h-11 w-full rounded-xl"
                      >
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="resource-request">
                            Resource Request
                          </SelectItem>
                          <SelectItem value="technical-issue">
                            Technical Issue
                          </SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="ticket-priority">Priority</FieldLabel>
                    <Select defaultValue="medium" name="priority">
                      <SelectTrigger
                        id="ticket-priority"
                        className="h-11 w-full rounded-xl"
                      >
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="ticket-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    id="ticket-description"
                    name="description"
                    required
                    rows={5}
                    className="rounded-xl"
                    placeholder="Describe exactly what you are looking for or the issue you are facing..."
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="ticket-file">
                    Attach Screenshots or References
                  </FieldLabel>
                  <label
                    htmlFor="ticket-file"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center transition hover:bg-muted/60"
                  >
                    <CloudUpload className="size-9 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or PDF up to 10MB
                    </p>
                  </label>
                  <FieldDescription>
                    Upload references to help us understand your request faster.
                  </FieldDescription>
                  <Input
                    id="ticket-file"
                    name="file"
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    className="hidden"
                  />
                </Field>
              </FieldSet>

              <DialogFooter className="gap-3 pt-2 sm:flex-row-reverse sm:justify-start">
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 flex-1 rounded-xl font-bold"
                >
                  Submit Ticket
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="h-11 flex-1 rounded-xl"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
