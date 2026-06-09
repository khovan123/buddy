import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { usernameSeedFromEmail } from '../../domain/value-objects/username.vo';

export async function generateUniqueUsername(
  email: string,
  userRepository: IUserRepository,
): Promise<string> {
  const seed = usernameSeedFromEmail(email);
  let candidate = seed;
  let suffix = 2;

  while (await userRepository.existsByUsername(candidate)) {
    candidate = `${seed}${suffix}`;
    suffix += 1;
  }

  return candidate;
}
