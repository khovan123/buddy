/** Interface representing data constraints for  refresh token data. */
export interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/** Interface representing data constraints for  i refresh token repository. */
export interface IRefreshTokenRepository {
  save(token: RefreshTokenData): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenData | null>;
  deleteByUserId(userId: string): Promise<void>;
  deleteByHash(tokenHash: string): Promise<void>;
  deleteExpired(): Promise<void>;
}
