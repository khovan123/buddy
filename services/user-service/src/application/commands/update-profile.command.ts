/** CQRS Command designed to enforce  update profile. */
export class UpdateProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly changes: Partial<{
      nickname: string;
      username: string;
      phone: string;
      bio: string;
      dateOfBirth: Date;
      majorId: string;
      courseId: string;
      semester: number;
      careerId: string;
      skillIds: string[];
    }>,
    public readonly correlationId?: string,
    public readonly email?: string,
  ) {}
}
