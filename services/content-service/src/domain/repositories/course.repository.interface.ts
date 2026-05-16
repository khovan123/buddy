import { CourseEntity, CourseStatus } from '../entities/course.entity';
import { MajorQueryItem } from './major.repository.interface';

export interface CourseQueryItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  isCompulsory: boolean;
  majorId: string;
  major?: MajorQueryItem;
  prerequisiteCourseIds: string[];
  status: CourseStatus;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/** Interface representing data constraints for  i course repository. */
export interface ICourseRepository {
  findAll(): Promise<CourseQueryItem[]>;
  findById(id: string): Promise<CourseEntity | null>;
  findByIds(ids: string[]): Promise<CourseEntity[]>;
  findByMajorId(majorId: string): Promise<CourseQueryItem[]>;
  create(data: Partial<CourseEntity>): Promise<CourseEntity>;
  update(id: string, data: Partial<CourseEntity>): Promise<CourseEntity | null>;
  delete(id: string): Promise<boolean>;
}
