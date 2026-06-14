const LOCAL_SERVICE_HOSTS = new Set(['localhost', '0.0.0.0', '::1', 'host.docker.internal']);

export function shouldUseCloudRunAuth(serviceBaseUrl: string): boolean {
  try {
    const { hostname } = new URL(serviceBaseUrl);

    if (LOCAL_SERVICE_HOSTS.has(hostname) || hostname.startsWith('127.')) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}
