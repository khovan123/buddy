/**
 * Executes the resolve extension operation.
 *
 * @param fileName - The fileName parameter
 * @returns Result of type string
 */
export function resolveExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
}
