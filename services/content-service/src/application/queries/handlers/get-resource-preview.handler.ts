import { AppLogger } from '@libs/common';
import { GetPreviewUrlEvent, PreviewStatus, ResourcePreviewResponse } from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { GetResourcePreviewQuery } from '../get-resource-preview.query';

/**
 * GetResourcePreviewHandler — Fetches a preview URL for a resource document.
 *
 * Optimized single-RPC flow using cached `primaryS3Key`:
 * 1. Find resource by slug → read cached `primaryS3Key`
 * 2. Free resource (price === 0) → return full access indicator
 * 3. Paid resource → direct RPC with `s3Key` only (no upload-history round-trip)
 */
@QueryHandler(GetResourcePreviewQuery)
@Injectable()
export class GetResourcePreviewHandler implements IQueryHandler<GetResourcePreviewQuery> {
  private readonly logger = new AppLogger(GetResourcePreviewHandler.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
  ) {}

  async execute(query: GetResourcePreviewQuery): Promise<ResourcePreviewResponse | null> {
    const { slug } = query;

    // 1. Find resource (includes cached primaryS3Key)
    const resource = await this.resourceRepository.findBySlugWithDetails(slug);
    if (!resource) return null;

    const extension = this.resolveFormat(resource);

    // 2. Free resource → no preview needed (full access)
    if (resource.price === 0) {
      return {
        previewUrl: null,
        isReady: true,
        isPreview: false, // Not a preview — full access
        previewPercentage: 100,
        status: PreviewStatus.AVAILABLE,
        resourceTitle: resource.title,
        resourceSlug: resource.slug,
        format: extension,
      };
    }

    // 3. Check for cached primaryS3Key
    const primaryS3Key = resource.primaryS3Key;

    if (!primaryS3Key) {
      this.logger.warn(
        `No primaryS3Key cached for resource ${resource.id} (slug=${slug}). ` +
          `Upload may still be processing.`,
      );
      return {
        previewUrl: null,
        isReady: false,
        isPreview: true,
        previewPercentage: 30,
        status: PreviewStatus.PROCESSING,
        resourceTitle: resource.title,
        resourceSlug: resource.slug,
        format: extension,
      };
    }

    // 4. Single RPC → upload-service (s3Key only, no upload-history round-trip)
    try {
      const previewEvent = new GetPreviewUrlEvent({ s3Key: primaryS3Key });
      const previewResponse = await this.storageBrokerPublisher.getPreviewUrl(previewEvent);

      return {
        ...previewResponse,
        resourceTitle: resource.title,
        resourceSlug: resource.slug,
        format: extension,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get preview for resource ${resource.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        previewUrl: null,
        isReady: false,
        isPreview: true,
        previewPercentage: 30,
        status: PreviewStatus.FAILED,
        resourceTitle: resource.title,
        resourceSlug: resource.slug,
        format: extension,
      };
    }
  }

  /** Extension → display-friendly format label */
  private static readonly FORMAT_MAP: Record<string, string> = {
    '.pdf': 'PDF',
    '.doc': 'DOC',
    '.docx': 'DOCX',
    '.xls': 'XLS',
    '.xlsx': 'XLSX',
    '.ppt': 'PPT',
    '.pptx': 'PPTX',
    '.txt': 'TXT',
    '.csv': 'CSV',
    '.rtf': 'RTF',
  };

  /**
   * Resolve display format from resource metadata.
   * Reads `meta[0].extension` from the lean MongoDB document.
   * Falls back to 'PDF' as the default.
   */
  private resolveFormat(resource: Record<string, any>): string {
    const meta = resource.meta ?? resource._doc?.meta;
    const ext: string | undefined = Array.isArray(meta) ? meta[0]?.extension : undefined;

    if (!ext) return 'PDF';

    const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return GetResourcePreviewHandler.FORMAT_MAP[normalized] ?? ext.replace('.', '').toUpperCase();
  }
}
