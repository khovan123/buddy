import type { FastifyRequest } from 'fastify';

import { ResourceProxyController } from '../../src/presentation/http/controllers/resource-proxy.controller';
import type { HttpProxyService } from '../../src/infrastructure/http/http-proxy.service';

describe('ResourceProxyController', () => {
  const request = { headers: {} } as FastifyRequest;

  it('registers the preview route before the catch-all slug route', () => {
    const methods = Object.getOwnPropertyNames(ResourceProxyController.prototype);

    expect(methods.indexOf('getResourcePreview')).toBeGreaterThan(-1);
    expect(methods.indexOf('getResourceBySlug')).toBeGreaterThan(-1);
    expect(methods.indexOf('getResourcePreview')).toBeLessThan(
      methods.indexOf('getResourceBySlug'),
    );
  });

  it('forwards resource preview requests to the content preview endpoint', () => {
    const proxy = {
      forward: jest.fn().mockReturnValue(Promise.resolve({ data: null })),
    } as unknown as HttpProxyService;
    const controller = new ResourceProxyController(proxy);

    controller.getResourcePreview('sql-fundamentals-guide-1', request);

    expect(proxy.forward).toHaveBeenCalledWith(request, {
      service: 'content',
      path: '/v1/resources/sql-fundamentals-guide-1/preview',
      method: 'GET',
    });
  });
});
