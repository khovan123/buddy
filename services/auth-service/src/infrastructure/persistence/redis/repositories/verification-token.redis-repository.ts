import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { IVerificationTokenRepository, VerificationTokenPurpose } from '../../../../domain/repositories/verification-token.repository.interface';

/** Repository interface/implementation for verification token redis data access. */
@Injectable()
export class VerificationTokenRedisRepository implements IVerificationTokenRepository {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Executes the key operation.
   *
   * @param email - The email parameter
   * @param purpose - The purpose parameter
   * @returns Result of type string
   */
  private key(email: string, purpose: VerificationTokenPurpose): string {
    return `token:${purpose}:${email.toLowerCase()}`;
  }

  /**
   * Executes the save operation.
   *
   * @param email - The email parameter
   * @param token - The token parameter
   * @param purpose - The purpose parameter
   * @param ttlSeconds - The ttlSeconds parameter
   */
  async save(email: string, token: string, purpose: VerificationTokenPurpose, ttlSeconds: number): Promise<void> {
    await this.cache.set(this.key(email, purpose), token, ttlSeconds * 1000);
  }

  /**
   * Executes the find operation.
   *
   * @param email - The email parameter
   * @param purpose - The purpose parameter
   * @returns Result of type Promise<string | null>
   */
  async find(email: string, purpose: VerificationTokenPurpose): Promise<string | null> {
    const value = await this.cache.get<string>(this.key(email, purpose));
    return value ?? null;
  }

  /**
   * Executes the delete operation.
   *
   * @param email - The email parameter
   * @param purpose - The purpose parameter
   */
  async delete(email: string, purpose: VerificationTokenPurpose): Promise<void> {
    await this.cache.del(this.key(email, purpose));
  }
}
