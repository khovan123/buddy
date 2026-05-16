import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Circuit Breaker states following the standard state machine:
 * CLOSED → OPEN → HALF_OPEN → CLOSED (or back to OPEN)
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Name for logging/metrics. */
  name: string;
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Time in ms to stay OPEN before transitioning to HALF_OPEN. Default: 30_000 */
  resetTimeoutMs?: number;
  /** Max successful calls in HALF_OPEN before closing. Default: 2 */
  halfOpenMaxAttempts?: number;
}

/**
 * Lightweight, zero-dependency circuit breaker.
 *
 * Usage:
 *   const breaker = new CircuitBreaker({ name: 'auth-service' });
 *   const result = await breaker.execute(() => fetch(url), () => cachedResult);
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;
  readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 2;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Execute an action through the circuit breaker.
   *
   * @param action  — The primary operation (e.g. HTTP call)
   * @param fallback — Optional fallback when circuit is OPEN
   */
  async execute<T>(action: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
      } else {
        // Circuit is OPEN — reject immediately
        if (fallback) {
          return fallback();
        }
        throw new HttpException(
          {
            message: `Service ${this.name} is temporarily unavailable (circuit breaker OPEN)`,
            circuitBreaker: { state: this.state, name: this.name },
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxAttempts) {
        this.transitionTo(CircuitBreakerState.CLOSED);
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN → go back to OPEN
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitBreakerState.OPEN);
    }
  }

  private shouldTransitionToHalfOpen(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;

    if (newState === CircuitBreakerState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitBreakerState.HALF_OPEN) {
      this.successCount = 0;
    }

    // Structured log for observability (picked up by tracing)
    console.log(
      `[CircuitBreaker:${this.name}] ${previousState} → ${newState} (failures=${this.failureCount})`,
    );
  }
}
