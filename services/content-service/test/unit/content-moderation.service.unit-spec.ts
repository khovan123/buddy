/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';

import { ContentModerationService } from '../../src/infrastructure/services/content-moderation.service';

describe('ContentModerationService', () => {
  const config = {
    get: jest.fn((_key: string, fallback?: string) => fallback),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-approves source code uploads by extension before provider checks', async () => {
    const service = new ContentModerationService(config);

    const result = await service.moderate({
      contentId: 'res-code',
      contentType: 'RESOURCE',
      title: 'Dart async sample',
      body: 'Code example',
      hightlights: [],
      extractedText: 'Future<void> main() async {}',
      files: [{ originalFilename: 'main.dart', mimeType: 'application/octet-stream' }],
    });

    expect(result.decision).toBe('APPROVED');
    expect(result.reasons).toEqual(['Source code file extension is allowed by moderation policy.']);
  });

  it('does not auto-approve supported document uploads', async () => {
    const service = new ContentModerationService(config);

    const result = await service.moderate({
      contentId: 'res-doc',
      contentType: 'RESOURCE',
      title: 'Document',
      body: 'Document summary',
      hightlights: [],
      extractedText: 'Document content',
      files: [{ originalFilename: 'notes.pdf', mimeType: 'application/pdf' }],
    });

    expect(result.decision).toBe('NEEDS_REVIEW');
    expect(result.reasons).toEqual(['No moderation provider configured.']);
  });
});
