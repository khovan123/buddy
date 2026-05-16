/**
 * CQRS Query to get a document preview URL for a resource.
 * Percentage is fixed at 30% (handled by upload-service internally).
 */
export class GetResourcePreviewQuery {
  constructor(public readonly slug: string) {}
}
