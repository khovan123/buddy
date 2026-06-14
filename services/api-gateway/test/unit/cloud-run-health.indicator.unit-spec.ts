import { CloudRunHealthIndicator } from '@libs/common';
import { HealthCheckError } from '@nestjs/terminus';

const getIdTokenClient = jest.fn();

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getIdTokenClient,
  })),
}));

describe('CloudRunHealthIndicator', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    getIdTokenClient.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('adds a Cloud Run auth header before pinging a service', async () => {
    const getRequestHeaders = jest.fn().mockResolvedValue(
      new Headers({
        Authorization: 'Bearer test-token',
      }),
    );
    getIdTokenClient.mockResolvedValue({ getRequestHeaders });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const indicator = new CloudRunHealthIndicator();
    const result = await indicator.pingCheck(
      'auth-service',
      'https://auth-service.example.com/v1/health/liveness',
    );

    expect(getIdTokenClient).toHaveBeenCalledWith('https://auth-service.example.com');
    expect(getRequestHeaders).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth-service.example.com/v1/health/liveness',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'X-Serverless-Authorization': 'Bearer test-token',
        },
      }),
    );
    expect(result).toEqual({ 'auth-service': { status: 'up' } });
  });

  it('does not load Google credentials before pinging a local service', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const indicator = new CloudRunHealthIndicator();
    const result = await indicator.pingCheck(
      'auth-service',
      'http://127.0.0.1:3001/v1/health/liveness',
    );

    expect(getIdTokenClient).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/v1/health/liveness',
      expect.objectContaining({
        method: 'GET',
        headers: {},
      }),
    );
    expect(result).toEqual({ 'auth-service': { status: 'up' } });
  });

  it('throws a health check error when the service returns 403', async () => {
    const getRequestHeaders = jest.fn().mockResolvedValue(new Headers());
    getIdTokenClient.mockResolvedValue({ getRequestHeaders });
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const indicator = new CloudRunHealthIndicator();

    await expect(
      indicator.pingCheck('user-service', 'https://user-service.example.com/v1/health/liveness'),
    ).rejects.toBeInstanceOf(HealthCheckError);
  });
});
