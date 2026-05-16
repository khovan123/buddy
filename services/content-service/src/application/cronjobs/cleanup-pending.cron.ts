import { AppLogger } from '@libs/common';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import type { IResourceRepository } from '../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY, TUTORIAL_REPOSITORY } from '../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../domain/repositories/tutorial.repository.interface';

/** Represents the  cleanup pending cron component. */
@Injectable()
export class CleanupPendingCron {
  private readonly logger = new AppLogger(CleanupPendingCron.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  /**
   * Executes the cleanup pending records operation.
   *
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupPendingRecords(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [deletedResources, deletedTutorials] = await Promise.all([
      this.resourceRepository.deletePendingOlderThan(cutoff),
      this.tutorialRepository.deletePendingOlderThan(cutoff),
    ]);

    this.logger.log(
      `Cleanup stale pending done: resources=${deletedResources}, tutorials=${deletedTutorials}, cutoff=${cutoff.toISOString()}`,
    );
  }
}
