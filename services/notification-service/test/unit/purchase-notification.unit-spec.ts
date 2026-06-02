import { describe, expect, it, jest } from '@jest/globals';
import { Notification } from '../../src/domain/entities/notification.entity';
import { NotificationConsumer } from '../../src/infrastructure/messaging/consumers/notification.consumer';

process.env.LOG_LEVEL = 'silent';
process.env.SERVICE_NAME = 'notification-service-test';
process.env.NODE_ENV = 'test';

describe('NotificationConsumer purchase notifications', () => {
  it('stores an in-app notification for both buyer and seller', async () => {
    const savedNotifications: Array<{
      userId: string;
      type: string;
      channel: string;
      templateId: string;
    }> = [];
    const stream = { publish: jest.fn() };
    const consumer = new NotificationConsumer(
      { execute: jest.fn() } as never,
      { republishWithDelay: jest.fn() } as never,
      stream as never,
      {
        save: jest.fn(async (notification: Notification) => {
          savedNotifications.push({
            userId: notification.userId,
            type: notification.type,
            channel: notification.channel,
            templateId: notification.templateId,
          });
          return notification;
        }),
      } as never,
    );

    await consumer.handlePurchaseCompleted({
      correlationId: 'purchase-correlation',
      payload: {
        purchaseId: 'purchase-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        amount: '120000',
        purchasedAt: new Date().toISOString(),
        items: [{ itemId: 'resource-1', itemType: 'RESOURCE' }],
      },
    });

    expect(savedNotifications).toEqual([
      {
        userId: 'buyer-1',
        type: 'in_app',
        channel: 'purchase',
        templateId: 'purchase-buyer',
      },
      {
        userId: 'seller-1',
        type: 'in_app',
        channel: 'purchase',
        templateId: 'purchase-seller',
      },
    ]);
    expect(stream.publish).toHaveBeenCalledTimes(2);
  });
});
