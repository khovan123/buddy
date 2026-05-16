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
import { Major, MajorStatus } from "@/features/content/types"

import DeleteMajorDialog from "../modals/delete-major-dialog"
import MajorModal from "../modals/major-modal"

interface MajorsTableProps {
  majors: Major[]
}

export default function MajorsTable({ majors }: MajorsTableProps) {
  const [majorModalOpen, setMajorModalOpen] = useState(false)
  const [selectedMajor, setSelectedMajor] = useState<Major | undefined>()
  const [deleteMajorId, setDeleteMajorId] = useState<string | null>(null)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Majors List</CardTitle>
            <CardDescription>
              All academic majors defined in the system. ({majors.length})
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedMajor(undefined)
              setMajorModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Major
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="h-10 px-4 align-middle font-medium">Code</th>
                  <th className="h-10 px-4 align-middle font-medium">Name</th>
                  <th className="h-10 px-4 align-middle font-medium">Status</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {majors.map((major) => (
                  <tr
                    key={major.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle font-medium">
                      {major.code}
                    </td>
                    <td className="p-4 align-middle">{major.name}</td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant={
                          major.status === MajorStatus.ACTIVE
                            ? "default"
                            : "destructive"
                        }
                      >
                        {major.status}
                      </Badge>
                    </td>
                    <td className="flex justify-end gap-2 p-4 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedMajor(major)
                          setMajorModalOpen(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteMajorId(major.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {majors.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No majors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <MajorModal
        open={majorModalOpen}
        onOpenChange={setMajorModalOpen}
        major={selectedMajor}
      />
      <DeleteMajorDialog
        open={!!deleteMajorId}
        id={deleteMajorId}
        onOpenChange={(open) => !open && setDeleteMajorId(null)}
      />
    </>
  )
}
