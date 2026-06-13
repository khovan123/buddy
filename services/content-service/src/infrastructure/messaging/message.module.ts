import { ContentExtractedConsumer } from './consumers/content-extracted.consumer';
import { ContentValidationConsumer } from './consumers/content-validation.consumer';
import { PurchaseCatalogConsumer } from './consumers/purchase-catalog.consumer';
import { PurchaseConsumer } from './consumers/purchase.consumer';
import { ResourceUploadedConsumer } from './consumers/resource-uploaded.consumer';
import { ThumbnailUploadedConsumer } from './consumers/thumbnail-uploaded.consumer';
import { UploadProcessedConsumer } from './consumers/upload-processed.consumer';
import { UserProfileUpdatedConsumer } from './consumers/user-profile-updated.consumer';
import { RecommendationSyncPublisher } from './publishers/recommendation-sync.publisher';
import { ContentModerationNotificationPublisher } from './publishers/content-moderation-notification.publisher';
import { ContentRetryPublisher } from './publishers/content-retry.publisher';
import { StorageBrokerPublisher } from './publishers/storage-broker.rpc';
import { UserServicePublisher } from './publishers/user-service.rpc';
import { IdempotentConsumerService } from '../services/idempotent-consumer.service';

export const MESSAGE_CONTROLLERS = [];

export const MESSAGE_COMPONENTS = [
  ContentValidationConsumer,
  PurchaseCatalogConsumer,
  PurchaseConsumer,
  ContentExtractedConsumer,
  UploadProcessedConsumer,
  ResourceUploadedConsumer,
  ThumbnailUploadedConsumer,
  UserProfileUpdatedConsumer,
  RecommendationSyncPublisher,
  ContentModerationNotificationPublisher,
  ContentRetryPublisher,
  StorageBrokerPublisher,
  UserServicePublisher,
  IdempotentConsumerService,
];
