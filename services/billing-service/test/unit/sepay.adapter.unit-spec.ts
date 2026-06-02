import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { SePayAdapter } from '../../src/infrastructure/external/payment/sepay.adapter';

function createAdapter(secret = 'test-webhook-secret'): SePayAdapter {
  const values: Record<string, string> = {
    SEPAY_MERCHANT_ID: 'merchant-id',
    SEPAY_SECRET_KEY: 'merchant-secret',
    SEPAY_WEBHOOK_SECRET_KEY: secret,
    SEPAY_ENV: 'production',
  };

  const config = {
    get: <T = string>(key: string, defaultValue?: T): T | string | undefined =>
      values[key] ?? defaultValue,
  } as ConfigService;

  return new SePayAdapter(config);
}

function sign(secret: string, timestamp: string, rawBody: string): string {
  return (
    'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  );
}

describe('SePayAdapter', () => {
  it('verifies HMAC-SHA256 using timestamp and raw body', async () => {
    const secret = 'hmac-secret';
    const timestamp = '1764663000';
    const payload = {
      id: 1001,
      transferType: 'in',
      transferAmount: 50000,
      code: 'INV-1764663000-SEPAY-1001',
      content: 'Top up wallet',
    };
    const rawBody = JSON.stringify(payload, null, 2);
    const adapter = createAdapter(secret);

    const result = await adapter.verifyWebhook({
      rawBody,
      headers: {
        'x-sepay-signature': sign(secret, timestamp, rawBody),
        'x-sepay-timestamp': timestamp,
      },
    });

    expect(result.success).toBe(true);
    expect(result.externalReference).toBe(payload.code);
    expect(result.amountInCents).toBe(50000n);
  });

  it('prefers the invoice number from bank transfer content over SePay payment code', async () => {
    const secret = 'hmac-secret';
    const timestamp = '1764663000';
    const payload = {
      id: 1001,
      transferType: 'in',
      transferAmount: 50000,
      code: 'SEPAY-1764663000',
      content: 'SEPAY-1764663000 INV-1764663000-SEPAY-1764663000 Wallet top-up',
    };
    const rawBody = JSON.stringify(payload);
    const adapter = createAdapter(secret);

    const result = await adapter.verifyWebhook({
      rawBody,
      headers: {
        'x-sepay-signature': sign(secret, timestamp, rawBody),
        'x-sepay-timestamp': timestamp,
      },
    });

    expect(result.success).toBe(true);
    expect(result.externalReference).toBe('INV-1764663000-SEPAY-1764663000');
    expect(result.amountInCents).toBe(50000n);
  });

  it('rejects invalid HMAC-SHA256 signatures', async () => {
    const adapter = createAdapter('hmac-secret');
    const payload = {
      id: 1001,
      transferType: 'in',
      transferAmount: 50000,
      code: 'INV-1764663000-SEPAY-1001',
    };

    await expect(
      adapter.verifyWebhook({
        rawBody: JSON.stringify(payload),
        headers: {
          'x-sepay-signature': 'sha256=bad-signature',
          'x-sepay-timestamp': '1764663000',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
