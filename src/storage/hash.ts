/**
 * FNV-1a 32-bit hash — fast and deterministic.
 * Used for integrity verification (save signatures) and content fingerprinting.
 * This is NOT a cryptographic hash — do not use for security-sensitive purposes.
 */
export const fnv1a = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};
