import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { CourseStatus } from '../../../../domain/entities/course.entity';

/** Represents the  course component. */
@Schema({ timestamps: true, collection: 'Courses' })
export class Course {
  @Prop({ required: true, unique: true, trim: true })
  code!: string; // Mã môn học (vd: PRF192)

  @Prop({ required: true, trim: true })
  name!: string; // Tên môn học

  @Prop({ required: true, min: 1 })
  credits!: number; // Số tín chỉ

  @Prop({ required: true, min: 1 })
  semester!: number; // Tầng trung gian: Học kỳ thứ mấy (1, 2, 3...)

  @Prop({ default: true })
  isCompulsory!: boolean; // Môn bắt buộc (true) hay tự chọn (false)

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Major',
    required: true,
  })
  majorId!: string; // Liên kết phẳng trực tiếp tới Major

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Course' }],
    default: [],
  })
  prerequisiteCourseIds!: string[]; // Các môn tiên quyết cần học trước (nếu có)

  @Prop({ type: String, enum: CourseStatus, default: CourseStatus.ACTIVE })
  status!: CourseStatus;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);

// Thiết lập Virtual Field để populate thông tin Major khi query Course
CourseSchema.virtual('major', {
  ref: 'Major',
  localField: 'majorId',
  foreignField: '_id',
  justOne: true,
});

// Thiết lập Virtual Field để populate các môn tiên quyết
CourseSchema.virtual('prerequisiteCourses', {
  ref: 'Course',
  localField: 'prerequisiteCourseIds',
  foreignField: '_id',
  justOne: false,
});

// Đảm bảo virtuals được hiển thị khi convert ra JSON/Object
CourseSchema.set('toJSON', { virtuals: true });
CourseSchema.set('toObject', { virtuals: true });
