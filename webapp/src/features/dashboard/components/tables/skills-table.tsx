"use client"

import { useState } from "react"

import { Edit2, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type CareerItem,
  type SkillItem,
} from "@/features/user/services/user-api"

import DeleteSkillDialog from "../modals/delete-skill-dialog"
import SkillModal from "../modals/skill-modal"

interface SkillsTableProps {
  skills: SkillItem[]
  careers: CareerItem[]
}

export default function SkillsTable({ skills, careers }: SkillsTableProps) {
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | undefined>()
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Skills List</CardTitle>
            <CardDescription>
              Skills linked to careers. ({skills.length})
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedSkill(undefined)
              setSkillModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Skill
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="h-10 px-4 align-middle font-medium">Name</th>
                  <th className="h-10 px-4 align-middle font-medium">Career</th>
                  <th className="h-10 px-4 align-middle font-medium">Status</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill) => (
                  <tr
                    key={skill.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle font-medium">
                      {skill.name}
                    </td>
                    <td className="p-4 align-middle">
                      {careers.find((c) => c.id === skill.careerId)?.name ||
                        skill.careerId}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant={
                          skill.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {skill.status}
                      </Badge>
                    </td>
                    <td className="flex justify-end gap-2 p-4 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSkill(skill)
                          setSkillModalOpen(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteSkillId(skill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {skills.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No skills found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <SkillModal
        open={skillModalOpen}
        onOpenChange={setSkillModalOpen}
        skill={selectedSkill}
        careers={careers}
      />
      <DeleteSkillDialog
        open={!!deleteSkillId}
        id={deleteSkillId}
        onOpenChange={(open) => !open && setDeleteSkillId(null)}
      />
    </>
  )
}
