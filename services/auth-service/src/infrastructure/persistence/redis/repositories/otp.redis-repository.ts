import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { IOtpRepository } from '../../../../domain/repositories/otp.repository.interface';
import { OtpPurpose } from '../../../../domain/value-objects/otp.vo';

/** Repository interface/implementation for  otp redis data access. */
@Injectable()
export class OtpRedisRepository implements IOtpRepository {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Executes the key operation.
   *
   * @param email - The email parameter
   * @param purpose - The purpose parameter
   * @returns Result of type string
   */
  private key(email: string, purpose: OtpPurpose): string {
    return `otp:${purpose}:${email.toLowerCase()}`;
  }

  /**
   * Executes the save operation.
   *
   * @param email - The email parameter
   * @param otp - The otp parameter
   * @param purpose - The purpose parameter
   * @param ttlSeconds - The ttlSeconds parameter
   */
  async save(email: string, otp: string, purpose: OtpPurpose, ttlSeconds: number): Promise<void> {
    await this.cache.set(this.key(email, purpose), otp, ttlSeconds * 1000);
  }

  /**
   * Executes the find operation.
   *
   * @param email - The email parameter
   * @param purpose - The purpose parameter
   * @returns Result of type Promise<string | null>
   */
  async find(email: string, purpose: OtpPurpose): Promise<string | null> {
    const value = await this.cache.get<string>(this.key(email, purpose));
    return value ?? null;
  }

  /**
   * Executes the delete operation.
   *
   * @param email - The email parameter
   * @param purpose - The purpose parameter
   */
  async delete(email: string, purpose: OtpPurpose): Promise<void> {
    await this.cache.del(this.key(email, purpose));
  }
}
