import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { INotificationRepository } from '../../../domain/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetNotificationsQuery } from '../get-notifications.query';

/** CQRS Handler to execute  get notifications. */
@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<GetNotificationsQuery> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   */
  async execute(query: GetNotificationsQuery) {
    const notifications = await this.repo.findByUserId(query.userId, query.limit);
    return notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      channel: n.channel,
      subject: n.subject,
      templateId: n.templateId,
      templateData: n.templateData,
      status: n.status,
      attempts: n.attempts,
      sentAt: n.createdAt,
      createdAt: n.createdAt,
    }));
  }
}
