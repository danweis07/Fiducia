/**
 * Cryptographically secure random number utilities for edge functions.
 */

/** Generate a cryptographically secure random integer in [min, max) */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min;
  if (range <= 0) throw new Error("max must be greater than min");
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] % range);
}

/** Generate a string of cryptographically secure random digits of given length */
export function secureRandomDigits(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}
