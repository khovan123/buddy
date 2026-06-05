/// <reference types="jest" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ConfigService } from '@nestjs/config';

import { ContentExtractionService } from '../../src/domain/services/content-extraction.service';

describe('ContentExtractionService', () => {
  const service = new ContentExtractionService({
    get: jest.fn((_key: string, fallback: string) => fallback),
  } as unknown as ConfigService);

  it('extracts text from docx uploads', async () => {
    const buffer = readFileSync(
      resolve(__dirname, '../../../../dummy/data/resources/test_doc.docx'),
    );

    const result = await service.extract(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'test_doc.docx',
    );

    expect(result.status).toBe('AVAILABLE');
    expect(result.text).toEqual(expect.any(String));
    expect(result.text?.length).toBeGreaterThan(20);
    expect(result.error).toBeNull();
  });

  it('extracts source text by filename when mime type is octet-stream', async () => {
    const result = await service.extract(
      Buffer.from('Future<void> main() async { print("hello"); }', 'utf-8'),
      'application/octet-stream',
      'step3_asynchronous.dart',
    );

    expect(result.status).toBe('AVAILABLE');
    expect(result.text).toContain('Future<void> main()');
    expect(result.error).toBeNull();
  });
});
