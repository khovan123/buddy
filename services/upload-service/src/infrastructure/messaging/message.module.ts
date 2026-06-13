import { ThumbnailUploadConsumer } from './consumers/thumbnail-upload.consumer';
import { UploadUrlConsumer } from './consumers/upload.rpc.consumer';
import { VideoUploadRequestConsumer } from './consumers/video-upload-request.consumer';
import { OutboxRelayService } from './listeners/outbox-relay.listener';
import { OutboxService } from './publishers/outbox.service';
import { UploadEventPublisher } from './publishers/upload-event.publisher';

export const MESSAGE_CONTROLLERS = [];

export const MESSAGE_COMPONENTS = [
  UploadUrlConsumer,
  VideoUploadRequestConsumer,
  ThumbnailUploadConsumer,
  UploadEventPublisher,
  OutboxService,
  OutboxRelayService,
];
