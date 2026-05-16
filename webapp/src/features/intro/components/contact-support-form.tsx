"use client"

import { useState } from "react"

import Link from "next/link"

import { ArrowLeft, Headphones, Mail, MessageSquare, Send } from "lucide-react"

import { MotionHero } from "@/components/atoms/motion-primitives"
import { Badge } from "@/components/ui/badge"
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

/* ------------------------------------------------------------------ */
/*  Support ticket form + help sidebar                                 */
/* ------------------------------------------------------------------ */

export function ContactSupportForm({ onBack }: { onBack: () => void }) {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-6 text-center">
        <MotionHero delay={0}>
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Headphones className="size-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Ticket submitted!</h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;ll review your request and respond as soon as possible.
            Check your email for confirmation.
          </p>
          <Button
            variant="outline"
            className="mt-8 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to contact
          </Button>
        </MotionHero>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6">
      <MotionHero delay={0}>
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to contact
        </button>
      </MotionHero>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <MotionHero delay={0.1}>
          <Card className="rounded-2xl border-border shadow-none">
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Headphones className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Submit a ticket</CardTitle>
              <CardDescription>
                Submit a ticket to our support team or email{" "}
                <a
                  href="mailto:support@buddy.edu"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  support@buddy.edu
                </a>{" "}
                directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  const event = e as unknown as Event
                  event.preventDefault()
                  setSubmitted(true)
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="support-email">Email address</Label>
                  <Input
                    id="support-email"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-category">Category</Label>
                  <Select>
                    <SelectTrigger id="support-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Account & Billing</SelectItem>
                      <SelectItem value="content">Content Issues</SelectItem>
                      <SelectItem value="technical">
                        Technical Problem
                      </SelectItem>
                      <SelectItem value="creator">Creator Tools</SelectItem>
                      <SelectItem value="report">Report Content</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-subject">Subject</Label>
                  <Input
                    id="support-subject"
                    placeholder="Brief summary of your issue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-description">Description</Label>
                  <Textarea
                    id="support-description"
                    placeholder="Please describe your issue in detail. Include steps to reproduce if applicable..."
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full rounded-full">
                  Submit ticket <Send className="ml-2 size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </MotionHero>

        {/* Help sidebar */}
        <MotionHero delay={0.25}>
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <Card className="rounded-2xl border-border shadow-none">
              <CardContent className="space-y-4 pt-6">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Quick help
                </p>

                <a
                  href="mailto:support@buddy.edu"
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <Mail className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Email support</p>
                    <p className="text-xs text-muted-foreground">
                      support@buddy.edu
                    </p>
                  </div>
                </a>

                <Link
                  href="https://discord.gg/buddy"
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <MessageSquare className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Discord community</p>
                    <p className="text-xs text-muted-foreground">
                      Get help from the community
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-none">
              <CardContent className="space-y-3 pt-6">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Response time
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Free tier</span>
                    <Badge variant="secondary" className="rounded-full text-xs">
                      48 hours
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pro plan</span>
                    <Badge variant="secondary" className="rounded-full text-xs">
                      24 hours
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enterprise</span>
                    <Badge variant="secondary" className="rounded-full text-xs">
                      4 hours
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </MotionHero>
      </div>
    </div>
  )
}
