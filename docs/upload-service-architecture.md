# Upload Service Architecture

This document reflects the current upload-service structure.

## Structure

```text
services/upload-service/src/
├── application/
│   ├── commands/handlers/
│   └── queries/handlers/
├── domain/
│   └── repositories/
├── infrastructure/
│   ├── messaging/
│   │   ├── consumers/
│   │   └── publishers/
│   ├── persistence/
│   │   ├── aws/
│   │   │   ├── s3.module.ts
│   │   │   └── s3.service.ts
│   │   ├── cloudinary/
│   │   │   ├── cloudinary.module.ts
│   │   │   └── cloudinary.service.ts
│   │   └── prisma/
│   └── queue/
│       └── video-processor.worker.ts
└── presentation/
    └── http/controllers/
```

## Responsibilities

- `S3Service` handles Supabase S3 presigned upload URLs for resource uploads.
- `S3Service` also uploads HLS directories and returns the streaming URL.
- `CloudinaryService` handles trailer upload for the first 15 seconds of the tutorial video.
- `VideoProcessorWorker` runs FFmpeg jobs in BullMQ workers and removes temporary files from `/tmp` after processing.
- `content-service` requests presigned upload URLs from this service and consumes `file.processed` events to update content metadata.

## Notes

- There is no separate `infrastructure/storage/` layer anymore.
- All storage integrations live under `infrastructure/persistence/`.
- The upload flow keeps FFmpeg work off the main thread and uses object storage for media artifacts.
