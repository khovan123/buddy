import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  EXCHANGES,
  RABBITMQ_CONNECTION,
  REDIS_KEYS,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import { GetUsersProfilesEvent, UserProfileRpcResponseDto } from '@libs/contracts';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

/** Cache TTL for user profiles in milliseconds (10 minutes). */
const PROFILE_CACHE_TTL = 600_000;

@Injectable()
export class UserServicePublisher {
  private readonly logger = new AppLogger(UserServicePublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private pendingRpcCalls = new Map<string, Promise<UserProfileRpcResponseDto | null>>();

  // ─── Public API ──────────────────────────────────────────────────

  async getUsersProfiles(userIds: string[]): Promise<UserProfileRpcResponseDto[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(userIds));

    // 1. Try to resolve from cache (fail-safe)
    const { cached, missingIds } = await this.resolveFromCache(uniqueIds);

    // 2. All resolved from cache → skip RPC entirely
    if (missingIds.length === 0) {
      return cached;
    }

    // 3. Request collapsing for missing IDs
    const flightPromises: Promise<UserProfileRpcResponseDto | null>[] = [];
    const idsToFetch: string[] = [];

    for (const id of missingIds) {
      if (this.pendingRpcCalls.has(id)) {
        flightPromises.push(this.pendingRpcCalls.get(id)!);
      } else {
        idsToFetch.push(id);
      }
    }

    // 4. Fire RPC for any IDs that are NOT currently in flight
    if (idsToFetch.length > 0) {
      const deferredResolvers = new Map<string, (val: UserProfileRpcResponseDto | null) => void>();

      for (const id of idsToFetch) {
        const promise = new Promise<UserProfileRpcResponseDto | null>((resolve) => {
          deferredResolvers.set(id, resolve);
        });
        this.pendingRpcCalls.set(id, promise);
        flightPromises.push(promise);
      }

      this.fetchViaRpc(idsToFetch)
        .then(async (rpcResults) => {
          const rpcMap = new Map(rpcResults.map((p) => [p.id, p]));

          // Caching
          await this.populateCache(rpcResults);

          // Resolve promises
          for (const id of idsToFetch) {
            const profile = rpcMap.get(id) || null;
            deferredResolvers.get(id)!(profile);
            this.pendingRpcCalls.delete(id);
          }
        })
        .catch((err) => {
          this.logger.error(`Failed bulk RPC fetch`, err);
          // Resolve with null so caller doesn't hang
          for (const id of idsToFetch) {
            deferredResolvers.get(id)!(null);
            this.pendingRpcCalls.delete(id);
          }
        });
    }

    // 5. Await all in-flight profiles
    const flightResults = await Promise.all(flightPromises);
    const validFlightResults = flightResults.filter(
      (p): p is UserProfileRpcResponseDto => p !== null,
    );

    return [...cached, ...validFlightResults];
  }

  /**
   * Invalidate cached profile for a specific user.
   * Called by UserProfileUpdatedConsumer when receiving profile change events.
   * Never throws — cache failures are logged and swallowed.
   */
  async invalidateCache(userId: string): Promise<void> {
    const key = REDIS_KEYS.contentUserProfile(userId);
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(
        `Failed to invalidate cache for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async enrichWithUploaders<T extends { userId: string }>(
    items: T[],
  ): Promise<(T & { uploader?: UserProfileRpcResponseDto })[]> {
    if (!items || items.length === 0) {
      return items;
    }

    const userIds = items.map((item) => item.userId);
    const profiles = await this.getUsersProfiles(userIds);

    const profileMap = new Map<string, UserProfileRpcResponseDto>();
    profiles.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    return items.map((item) => {
      const uploader = profileMap.get(item.userId);
      return {
        ...item,
        ...(uploader ? { uploader } : {}),
      };
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────

  /**
   * Attempt to resolve profiles from Redis cache.
   * Any cache error is swallowed — the userId is simply added to missingIds.
   */
  private async resolveFromCache(
    userIds: string[],
  ): Promise<{ cached: UserProfileRpcResponseDto[]; missingIds: string[] }> {
    const uniqueIds = [...new Set(userIds)];
    const keys = uniqueIds.map((id) => REDIS_KEYS.contentUserProfile(id));

    try {
      const hits = (await this.cache.mget(keys)) as (UserProfileRpcResponseDto | null)[];

      const cached: UserProfileRpcResponseDto[] = [];
      const missingIds: string[] = [];

      hits.forEach((hit, index) => {
        if (hit) {
          cached.push(hit);
        } else {
          missingIds.push(uniqueIds[index]);
        }
      });

      return { cached, missingIds };
    } catch {
      this.logger.error('Error during batch cache retrieval');
      return { cached: [], missingIds: uniqueIds };
    }
  }

  /**
   * Fetch user profiles via RabbitMQ RPC (existing logic, extracted).
   * Returns empty array on failure — never throws.
   */
  private async fetchViaRpc(userIds: string[]): Promise<UserProfileRpcResponseDto[]> {
    const event = new GetUsersProfilesEvent({ userIds });
    const routingKey = event.routingKey;

    const correlationId = ensureCorrelationId(
      event.correlationId,
      getCorrelationId(),
      event.eventId,
    );

    const messageData = attachTraceContextToMessage({
      eventId: event.eventId,
      routingKey: event.routingKey,
      version: event.version,
      occurredAt: event.occurredAt,
      correlationId,
      causationId: event.causationId,
      payload: event.payload,
    });

    try {
      return await this.amqpConnection.request<UserProfileRpcResponseDto[]>({
        exchange: EXCHANGES.USER,
        routingKey,
        payload: messageData,
        timeout: 10000,
      });
    } catch (err) {
      this.logger.error(
        `Error fetching user profiles via RPC`,
        err instanceof Error ? err.stack : String(err),
      );
      // Graceful fallback to avoid breaking query endpoints
      return [];
    }
  }

  /**
   * Store RPC results into Redis cache.
   * Any cache error is swallowed — the response is still returned to the caller.
   */
  private async populateCache(profiles: UserProfileRpcResponseDto[]): Promise<void> {
    for (const profile of profiles) {
      try {
        const plainData = JSON.parse(JSON.stringify(profile));
        await this.cache.set(
          REDIS_KEYS.contentUserProfile(profile.id),
          plainData,
          PROFILE_CACHE_TTL,
        );
      } catch {
        console.debug(`Cache failed for profileId: ${profile.id}`);
      }
    }
  }
}
