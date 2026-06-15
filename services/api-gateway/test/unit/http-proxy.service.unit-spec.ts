import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../src/infrastructure/http/http-proxy.service';
import type { ServiceRegistryService } from '../../src/infrastructure/config/service-registry.service';

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getIdTokenClient: jest.fn(),
  })),
}));

describe('HttpProxyService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env.LOG_LEVEL = 'silent';
    process.env.SERVICE_NAME = 'api-gateway';
    process.env.NODE_ENV = 'test';
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('surfaces upstream error bodies instead of a generic fallback', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Validation failed', field: 'title' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const registry = {
      getUrl: jest.fn().mockReturnValue('http://127.0.0.1:3004'),
    } as unknown as ServiceRegistryService;
    const service = new HttpProxyService(registry, new ConfigService());
    const req = {
      headers: {},
      ip: '127.0.0.1',
      hostname: 'localhost',
    } as FastifyRequest;

    try {
      await service.forward(req, {
        service: 'content',
        path: '/v1/resources',
        method: 'POST',
        body: { title: '' },
      });
      throw new Error('Expected request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(422);
      expect(httpError.getResponse()).toEqual({
        message: 'Validation failed',
        upstream: {
          service: 'content',
          statusCode: 422,
          path: '/v1/resources',
        },
      });
    }
  });
});
