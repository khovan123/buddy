/// <reference types="jest" />

import { PreviewProcessorContext } from '../../src/domain/services/preview-processor.context';

describe('PreviewProcessorContext', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'upload-service';
    process.env.NODE_ENV ??= 'test';
  });

  it('generates a text placeholder preview for unsupported file extensions', async () => {
    const context = new PreviewProcessorContext();

    const preview = await context.generatePreviewForFile(
      Buffer.from('binary source'),
      'application/zip',
      'archive.zip',
      0.3,
    );

    expect(context.isSupported('application/zip', 'archive.zip')).toBe(true);
    expect(context.getPreviewMimeType('application/zip', 'archive.zip')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(preview.toString('utf-8')).toContain('archive.zip');
    expect(preview.toString('utf-8')).toContain('A generated inline preview is not available');
  });
});
