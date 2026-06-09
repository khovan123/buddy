import { IUserProfileRepository } from '../repositories/user-profile.repository.interface';

export function usernameSeedFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const username = localPart
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return username || 'user';
}

export async function generateUniqueUsername(
  email: string,
  repo: IUserProfileRepository,
): Promise<string> {
  const seed = usernameSeedFromEmail(email);
  let candidate = seed;
  let suffix = 2;

  while (await repo.existsByUsername(candidate)) {
    candidate = `${seed}${suffix}`;
    suffix += 1;
  }

  return candidate;
}
