/** Enum representing course status values. */
export enum CourseStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED',
}

/** Interface representing data constraints for  course props. */
export interface CourseProps {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  isCompulsory: boolean;
  majorIds: string[];
  prerequisiteCourseIds: string[];
  status: CourseStatus;
  deletedAt?: Date;
}

/** Domain Entity representing a course. */
export class CourseEntity {
  private props: CourseProps;

  private constructor(props: CourseProps) {
    this.props = props;
  }

  /**
   * Creates a new CourseEntity.
   *
   * @param params - The creation parameters
   * @returns A new CourseEntity instance
   */
  static create(params: {
    code: string;
    name: string;
    credits: number;
    semester: number;
    isCompulsory?: boolean;
    majorIds: string[];
    prerequisiteCourseIds?: string[];
  }): CourseEntity {
    if (!params.majorIds || params.majorIds.length === 0) {
      throw new Error('A course must be linked to at least one major.');
    }
    return new CourseEntity({
      id: '',
      code: params.code,
      name: params.name,
      credits: params.credits,
      semester: params.semester,
      isCompulsory: params.isCompulsory ?? true,
      majorIds: Array.from(new Set(params.majorIds)),
      prerequisiteCourseIds: params.prerequisiteCourseIds ?? [],
      status: CourseStatus.ACTIVE,
    });
  }

  /**
   * Reconstitutes a CourseEntity from persisted data.
   *
   * @param props - The persisted props
   * @returns A reconstituted CourseEntity instance
   */
  static reconstitute(props: CourseProps): CourseEntity {
    return new CourseEntity(props);
  }

  get id(): string {
    return this.props.id;
  }

  set id(value: string) {
    this.props.id = value;
  }

  get code(): string {
    return this.props.code;
  }

  set code(value: string) {
    this.props.code = value;
  }

  get name(): string {
    return this.props.name;
  }

  set name(value: string) {
    this.props.name = value;
  }

  get credits(): number {
    return this.props.credits;
  }

  set credits(value: number) {
    this.props.credits = value;
  }

  get semester(): number {
    return this.props.semester;
  }

  set semester(value: number) {
    this.props.semester = value;
  }

  get isCompulsory(): boolean {
    return this.props.isCompulsory;
  }

  set isCompulsory(value: boolean) {
    this.props.isCompulsory = value;
  }

  get majorIds(): string[] {
    return this.props.majorIds;
  }

  set majorIds(value: string[]) {
    this.props.majorIds = value;
  }

  get prerequisiteCourseIds(): string[] {
    return this.props.prerequisiteCourseIds;
  }

  set prerequisiteCourseIds(value: string[]) {
    this.props.prerequisiteCourseIds = value;
  }

  get status(): CourseStatus {
    return this.props.status;
  }

  set status(value: CourseStatus) {
    this.props.status = value;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  set deletedAt(value: Date | undefined) {
    this.props.deletedAt = value;
  }
}
