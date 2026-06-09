export function usernameSeedFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const username = localPart
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return username || 'user';
}
