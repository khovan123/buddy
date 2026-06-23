import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { ICollectionRepository } from '../../domain/repositories/collection.repository.interface';
import type { ICourseRepository } from '../../domain/repositories/course.repository.interface';
import type { IMajorRepository } from '../../domain/repositories/major.repository.interface';
import type { IResourceRepository } from '../../domain/repositories/resource.repository.interface';
import {
  COLLECTION_REPOSITORY,
  COURSE_REPOSITORY,
  MAJOR_REPOSITORY,
  RESOURCE_REPOSITORY,
} from '../../domain/repositories/tokens';
import type { IContentValidationService } from '../../domain/services/content-validation.service';

/** Represents the  content validation service impl component. */
@Injectable()
export class ContentValidationServiceImpl implements IContentValidationService {
  constructor(
    @Inject(MAJOR_REPOSITORY)
    private readonly majorRepository: IMajorRepository,
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
  ) {}

  /**
   * Validate rằng tất cả items (resources hoặc collections) có cùng majorId và courseId
   * với target entity đang được tạo.
   *
   * Rule: Resource/Collection được add vào bắt buộc phải trùng majorId và courseId.
   * Không được mix lẫn lộn giữa các ngành và môn học khác nhau.
   */
  async validateTargetIntegrity(params: {
    majorId: string;
    courseId: string;
    resourceIds?: string[];
    collectionIds?: string[];
  }): Promise<void> {
    const { majorId, courseId, resourceIds, collectionIds } = params;

    // Validate resources cùng majorId & courseId
    if (resourceIds && resourceIds.length > 0) {
      const resources = await this.resourceRepository.findByIds(resourceIds);

      if (resources.length !== resourceIds.length) {
        const foundIds = new Set(resources.map((r) => r.id));
        const missingIds = resourceIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(`Resources not found: ${missingIds.join(', ')}`);
      }

      for (const resource of resources) {
        if (resource.majorId !== majorId) {
          throw new BadRequestException(
            `Resource "${resource.title}" (${resource.id}) belongs to majorId=${resource.majorId}, expected majorId=${majorId}. Cannot mix resources from different majors.`,
          );
        }
        if (resource.courseId !== courseId) {
          throw new BadRequestException(
            `Resource "${resource.title}" (${resource.id}) belongs to courseId=${resource.courseId}, expected courseId=${courseId}. Cannot mix resources from different courses.`,
          );
        }
      }
    }

    // Validate collections cùng majorId & courseId
    if (collectionIds && collectionIds.length > 0) {
      const collections = await this.collectionRepository.findByIds(collectionIds);

      if (collections.length !== collectionIds.length) {
        const foundIds = new Set(collections.map((c) => c.id));
        const missingIds = collectionIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(`Collections not found: ${missingIds.join(', ')}`);
      }

      for (const collection of collections) {
        if (collection.majorId !== majorId) {
          throw new BadRequestException(
            `Collection "${collection.title}" (${collection.id}) belongs to majorId=${collection.majorId}, expected majorId=${majorId}. Cannot mix collections from different majors.`,
          );
        }
        if (collection.courseId !== courseId) {
          throw new BadRequestException(
            `Collection "${collection.title}" (${collection.id}) belongs to courseId=${collection.courseId}, expected courseId=${courseId}. Cannot mix collections from different courses.`,
          );
        }
      }
    }
  }

  /**
   * Validate majorId tồn tại và active
   */
  async validateMajorExists(majorId: string): Promise<void> {
    const major = await this.majorRepository.findById(majorId);
    if (!major) {
      throw new BadRequestException(`Major with id=${majorId} not found`);
    }
  }

  /**
   * Validate courseId tồn tại, active và thuộc majorId
   */
  async validateCourseExists(courseId: string, majorId: string): Promise<void> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new BadRequestException(`Course with id=${courseId} not found`);
    }
    if (!course.majorIds || !course.majorIds.includes(majorId)) {
      throw new BadRequestException(
        `Course "${course.name}" (${courseId}) does not belong to majorId=${majorId}`,
      );
    }
  }
}
