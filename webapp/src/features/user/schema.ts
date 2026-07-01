import z from "zod"

export const profileUpdateSchema = z.object({
  nickname: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Số điện thoại không đúng định dạng")
    .or(z.literal(""))
    .optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().optional(),
  majorId: z.string().optional(),
  semester: z.number().int().positive().optional(),
  careerId: z.string().optional(),
  skillIds: z.array(z.string()),
})

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>
