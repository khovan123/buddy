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
import { Course, CourseStatus, Major } from "@/features/content/types"

import CourseModal from "../modals/course-modal"
import DeleteCourseDialog from "../modals/delete-course-dialog"

interface CoursesTableProps {
  courses: Course[]
  majors: Major[]
}

export default function CoursesTable({ courses, majors }: CoursesTableProps) {
  const [courseModalOpen, setCourseModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | undefined>()
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Courses List</CardTitle>
            <CardDescription>
              Academic courses linked to majors. ({courses.length})
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedCourse(undefined)
              setCourseModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Course
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="h-10 px-4 align-middle font-medium">Code</th>
                  <th className="h-10 px-4 align-middle font-medium">Name</th>
                  <th className="h-10 px-4 align-middle font-medium">Sem.</th>
                  <th className="h-10 px-4 align-middle font-medium">Major</th>
                  <th className="h-10 px-4 align-middle font-medium">Status</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle font-medium">
                      {course.code}
                    </td>
                    <td className="p-4 align-middle">
                      {course.name} ({course.credits} cr)
                    </td>
                    <td className="p-4 align-middle">{course.semester}</td>
                    <td className="p-4 align-middle">
                      {course.majors && course.majors.length > 0
                        ? course.majors.map((m) => m.code).join(", ")
                        : course.majorIds && course.majorIds.length > 0
                          ? course.majorIds
                              .map(
                                (id) =>
                                  majors.find((m) => m.id === id)?.code || id
                              )
                              .join(", ")
                          : course.major?.code ||
                            majors.find((m) => m.id === course.majorId)?.code ||
                            course.majorId ||
                            "-"}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant={
                          course.status === CourseStatus.ACTIVE
                            ? "default"
                            : course.status === CourseStatus.DELETED
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {course.status || "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="flex justify-end gap-2 p-4 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCourse(course)
                          setCourseModalOpen(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteCourseId(course.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No courses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <CourseModal
        open={courseModalOpen}
        onOpenChange={setCourseModalOpen}
        course={selectedCourse}
        majors={majors}
      />
      <DeleteCourseDialog
        open={!!deleteCourseId}
        id={deleteCourseId}
        onOpenChange={(open) => !open && setDeleteCourseId(null)}
      />
    </>
  )
}
