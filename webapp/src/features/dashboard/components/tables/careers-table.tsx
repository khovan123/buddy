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
import { type CareerItem } from "@/features/user/services/user-api"

import CareerModal from "../modals/career-modal"
import DeleteCareerDialog from "../modals/delete-career-dialog"

interface CareersTableProps {
  careers: CareerItem[]
}

export default function CareersTable({ careers }: CareersTableProps) {
  const [careerModalOpen, setCareerModalOpen] = useState(false)
  const [selectedCareer, setSelectedCareer] = useState<CareerItem | undefined>()
  const [deleteCareerId, setDeleteCareerId] = useState<string | null>(null)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Careers List</CardTitle>
            <CardDescription>
              All career paths defined in the system. ({careers.length})
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedCareer(undefined)
              setCareerModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Career
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="h-10 px-4 align-middle font-medium">Name</th>
                  <th className="h-10 px-4 align-middle font-medium">
                    Description
                  </th>
                  <th className="h-10 px-4 align-middle font-medium">Status</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {careers.map((career) => (
                  <tr
                    key={career.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle font-medium">
                      {career.name}
                    </td>
                    <td className="max-w-75 truncate p-4 align-middle">
                      {career.description}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant={
                          career.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {career.status}
                      </Badge>
                    </td>
                    <td className="flex justify-end gap-2 p-4 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCareer(career)
                          setCareerModalOpen(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteCareerId(career.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {careers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No careers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <CareerModal
        open={careerModalOpen}
        onOpenChange={setCareerModalOpen}
        career={selectedCareer}
      />
      <DeleteCareerDialog
        open={!!deleteCareerId}
        id={deleteCareerId}
        onOpenChange={(open) => !open && setDeleteCareerId(null)}
      />
    </>
  )
}
