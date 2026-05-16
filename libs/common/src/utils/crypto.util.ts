import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const SALT_ROUNDS = 12;

export const CryptoUtil = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  },

  generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  },

  generateOTP(length = 6): string {
    const digits = '0123456789';
    let otp = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      otp += digits[randomBytes[i] % 10];
    }
    return otp;
  },

  sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  },
};
