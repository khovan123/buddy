import { describe, expect, it, jest } from '@jest/globals';
import { Notification } from '../../src/domain/entities/notification.entity';
import { NotificationConsumer } from '../../src/infrastructure/messaging/consumers/notification.consumer';

process.env.LOG_LEVEL = 'silent';
process.env.SERVICE_NAME = 'notification-service-test';
process.env.NODE_ENV = 'test';

describe('NotificationConsumer purchase notifications', () => {
  it('stores and streams an in-app notification when a wallet top-up completes', async () => {
    const stream = { publish: jest.fn() };
    const save = jest.fn(async (notification: Notification) => notification);
    const consumer = new NotificationConsumer(
      { execute: jest.fn() } as never,
      { republishWithDelay: jest.fn() } as never,
      stream as never,
      { save } as never,
    );

    await consumer.handleWalletToppedUp({
      correlationId: 'top-up-correlation',
      payload: {
        transactionId: 'transaction-1',
        userId: 'user-1',
        walletId: 'wallet-1',
        amount: '100000',
        provider: 'SEPAY',
        toppedUpAt: new Date().toISOString(),
      },
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        channel: 'wallet',
        templateId: 'wallet-topped-up',
        templateData: expect.objectContaining({ amount: '100000' }),
      }),
    );
    expect(stream.publish).toHaveBeenCalledTimes(1);
  });

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

  it('stores and streams an in-app notification when content moderation completes', async () => {
    const savedNotifications: Array<{
      userId: string;
      type: string;
      channel: string;
      templateId: string;
      subject?: string;
      templateData: Record<string, unknown>;
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
            subject: notification.subject,
            templateData: notification.templateData,
          });
          return notification;
        }),
      } as never,
    );

    await consumer.handleContentModerationCompleted({
      correlationId: 'moderation-correlation',
      payload: {
        contentId: 'resource-1',
        contentType: 'RESOURCE',
        ownerId: 'creator-1',
        title: 'Physics Notes',
        slug: 'physics-notes',
        decision: 'APPROVED',
        score: 0.97,
        reasons: ['Content is safe and educational.'],
        ruleVersion: 'v1',
        moderatedAt: new Date().toISOString(),
      },
    });

    expect(savedNotifications).toEqual([
      expect.objectContaining({
        userId: 'creator-1',
        type: 'in_app',
        channel: 'content-moderation',
        templateId: 'content-moderation-completed',
        subject: 'Content approved',
        templateData: expect.objectContaining({
          contentId: 'resource-1',
          contentType: 'RESOURCE',
          decision: 'APPROVED',
        }),
      }),
    ]);
    expect(stream.publish).toHaveBeenCalledTimes(1);
  });
});
