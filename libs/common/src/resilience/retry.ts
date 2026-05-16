export interface RetryOptions {
  /** Max total attempts (including the first one). Default: 3 */
  maxAttempts?: number;
  /** Initial delay in ms before the first retry. Default: 1000 */
  delayMs?: number;
  /** Multiplier for exponential backoff. Default: 2 */
  backoffFactor?: number;
  /** Max delay cap in ms. Default: 30_000 */
  maxDelayMs?: number;
  /**
   * Predicate to decide if the error is retryable.
   * Return `true` to retry, `false` to throw immediately.
   * Default: retries on 5xx, 408 (timeout), 429 (rate limited).
   */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Default retryable check: retry 5xx, 408, 429.
 * Do NOT retry 4xx client errors (they won't magically succeed).
 */
function defaultIsRetryable(error: unknown): boolean {
  // HttpException or any error with a `status` or `statusCode`
  const status =
    (error as { status?: number })?.status ??
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status;

  if (status !== undefined) {
    if (status === 408 || status === 429) return true; // Timeout / Rate limited
    if (status >= 500) return true; // Server errors
    return false; // Other 4xx — not retryable
  }

  // Network errors (no status code) are retryable
  const name = (error as { name?: string })?.name;
  if (name === 'AbortError' || name === 'TypeError' || name === 'FetchError') {
    return true;
  }

  return true; // Unknown errors: retry by default
}

/**
 * Add random jitter to prevent thundering herd.
 * Returns delay ± 25% jitter.
 */
function addJitter(delayMs: number): number {
  const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 – 1.25
  return Math.round(delayMs * jitterFactor);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff and jitter.
 *
 * Usage:
 *   const data = await retry(() => fetch(url), { maxAttempts: 3 });
 */
export async function retry<T>(action: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 1_000;
  const backoffFactor = options?.backoffFactor ?? 2;
  const maxDelayMs = options?.maxDelayMs ?? 30_000;
  const isRetryable = options?.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }

      const rawDelay = Math.min(delayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs);
      const jitteredDelay = addJitter(rawDelay);

      console.log(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${jitteredDelay}ms...`,
      );

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}
