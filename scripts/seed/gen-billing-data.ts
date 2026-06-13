import {
  authUserIds,
  randInt,
  RESOURCE_COUNT,
  resourceIds,
  TUTORIAL_COUNT,
  tutorialIds,
  USER_COUNT,
} from './ids';

/**
 * Generate wallet transactions (billing-service, Postgres).
 *
 * Constraints from billing-service schema:
 *   - walletId: must reference existing wallet (wallets are 1:1 with users)
 *   - userId: must reference existing auth user
 *   - type: TransactionType enum (TOP_UP, PURCHASE_DEBIT, PURCHASE_CREDIT, etc.)
 *   - status: TransactionStatus enum (PENDING, SUCCESS, FAILED)
 *   - provider: PaymentProvider enum (SEPAY, BANK_TRANSFER) — required for TOP_UP
 *   - externalRef: unique if present
 *   - idempotencyKey: unique if present
 *   - amountInCents: BigInt
 *
 * From top-up-wallet.handler: creates PENDING top-up with externalReference
 * From process-purchase.handler: creates PURCHASE_DEBIT (buyer) + PURCHASE_CREDIT (seller)
 *
 * walletIds are passed in since they're generated at runtime in genWallets().
 */
export function genWalletTransactions(walletIdsByUser: Map<string, string>, count = 300) {
  const transactions: any[] = [];
  const usedExternalRefs = new Set<string>();
  const usedIdempotencyKeys = new Set<string>();

  for (let i = 0; i < count; i++) {
    const userIdx = randInt(0, USER_COUNT - 1);
    const userId = authUserIds[userIdx];
    const walletId = walletIdsByUser.get(userId);
    if (!walletId) continue;

    // 60% TOP_UP, 30% PURCHASE_DEBIT, 10% PURCHASE_CREDIT
    const r = Math.random();
    let type: string;
    let provider: string | null = null;
    let amountInCents: bigint;
    let metadata: Record<string, unknown> | null = null;

    if (r < 0.6) {
      type = 'TOP_UP';
      provider = ['SEPAY', 'BANK_TRANSFER'][randInt(0, 1)];
      amountInCents = BigInt(randInt(50, 500) * 1000); // 50k–500k VND
    } else if (r < 0.9) {
      type = 'PURCHASE_DEBIT';
      amountInCents = BigInt(randInt(10, 200) * 1000);
      // Pick a random content item
      const itemType = Math.random() < 0.6 ? 'RESOURCE' : 'TUTORIAL';
      const itemId =
        itemType === 'RESOURCE'
          ? resourceIds[randInt(0, RESOURCE_COUNT - 1)].toHexString()
          : tutorialIds[randInt(0, TUTORIAL_COUNT - 1)].toHexString();
      metadata = { itemId, itemType, purchaseId: crypto.randomUUID() };
    } else {
      type = 'PURCHASE_CREDIT';
      amountInCents = BigInt(randInt(10, 200) * 1000);
    }

    // Status: 80% SUCCESS, 15% PENDING, 5% FAILED
    const statusR = Math.random();
    const status = statusR < 0.8 ? 'SUCCESS' : statusR < 0.95 ? 'PENDING' : 'FAILED';

    // Generate unique external ref for top-ups
    let externalRef: string | null = null;
    if (type === 'TOP_UP') {
      let ref: string;
      do {
        ref = `${provider}-${Date.now()}-${randInt(1000, 9999)}`;
      } while (usedExternalRefs.has(ref));
      usedExternalRefs.add(ref);
      externalRef = ref;
    }

    // Generate unique idempotency key
    let idempotencyKey: string;
    do {
      idempotencyKey = `idem-${i}-${randInt(1000, 9999)}`;
    } while (usedIdempotencyKeys.has(idempotencyKey));
    usedIdempotencyKeys.add(idempotencyKey);

    transactions.push({
      id: crypto.randomUUID(),
      wallet_id: walletId,
      user_id: userId,
      type,
      status,
      provider,
      amount_in_cents: amountInCents,
      currency: 'VND',
      external_ref: externalRef,
      idempotency_key: idempotencyKey,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date(Date.now() - randInt(0, 90) * 86400000),
      confirmed_at: status === 'SUCCESS' ? new Date() : null,
    });
  }

  return transactions;
}

/**
 * Generate user resource ownership records (billing-service, Postgres).
 *
 * From process-purchase.handler: after a successful PURCHASE_DEBIT,
 * an ownership record is created for single resources/tutorials.
 *
 * Constraints:
 *   - Unique compound: (userId, resourceId)
 *   - resourceId is a content-service ObjectId hex string
 */
export function genUserResourceOwnership() {
  const ownerships: any[] = [];
  const seen = new Set<string>();

  // For each user, randomly own 2–8 resources
  for (let userIdx = 0; userIdx < USER_COUNT; userIdx++) {
    const userId = authUserIds[userIdx];
    const numOwned = randInt(2, 8);

    for (let j = 0; j < numOwned; j++) {
      const resIdx = randInt(0, RESOURCE_COUNT - 1);
      const resourceId = resourceIds[resIdx].toHexString();
      const key = `${userId}-${resourceId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      ownerships.push({
        id: crypto.randomUUID(),
        user_id: userId,
        resource_id: resourceId,
        granted_at: new Date(Date.now() - randInt(0, 60) * 86400000),
      });
    }
  }

  return ownerships;
}

/**
 * Generate payout accounts for ALL users (billing-service, Postgres).
 *
 * From save-payout-account.handler:
 *   - userId: unique (one payout account per user)
 *   - bankBin, bankAccountNumber, bankAccountName, bankName: required
 *   - verified: boolean
 *
 * Per user request: payout accounts for all users.
 */
const BANK_DATA = [
  { bin: '970436', name: 'Vietcombank', prefix: '0071' },
  { bin: '970418', name: 'BIDV', prefix: '4660' },
  { bin: '970415', name: 'VietinBank', prefix: '1060' },
  { bin: '970407', name: 'Techcombank', prefix: '1903' },
  { bin: '970422', name: 'MBBank', prefix: '0680' },
  { bin: '970423', name: 'TPBank', prefix: '0200' },
  { bin: '970432', name: 'VPBank', prefix: '2267' },
  { bin: '970448', name: 'OCB', prefix: '0010' },
];

export function genPayoutAccounts() {
  return authUserIds.map((userId, i) => {
    const bank = BANK_DATA[i % BANK_DATA.length];
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      bank_bin: bank.bin,
      bank_account_number: `${bank.prefix}${String(10000000 + i).slice(0, 7)}`,
      bank_account_name: `NGUYEN VAN ${String.fromCharCode(65 + (i % 26))}`,
      bank_name: bank.name,
      verified: true,
      verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
  });
}
