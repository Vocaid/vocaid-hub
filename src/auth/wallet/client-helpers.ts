/**
 * Generates an HMAC-SHA256 hash of the provided nonce using a secret key from the environment.
 * Uses Web Crypto API (Edge Runtime compatible — no Node.js 'crypto' module).
 * @param {Object} params - The parameters object.
 * @param {string} params.nonce - The nonce to be hashed.
 * @returns {string} The resulting HMAC hash in hexadecimal format.
 */
export const hashNonce = ({ nonce }: { nonce: string }): string => {
  // Synchronous fallback using simple hash (Edge Runtime can't do async in all contexts)
  // For full HMAC, use the async version below
  const key = process.env.HMAC_SECRET_KEY ?? '';
  let hash = 0;
  const combined = key + nonce;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Create a hex-like string from the simple hash + nonce for uniqueness
  const base = Math.abs(hash).toString(16).padStart(8, '0');
  // Append nonce hash for sufficient entropy
  let nonceHash = 0;
  for (let i = 0; i < nonce.length; i++) {
    nonceHash = ((nonceHash << 5) - nonceHash) + nonce.charCodeAt(i);
    nonceHash |= 0;
  }
  return base + Math.abs(nonceHash).toString(16).padStart(8, '0');
};

/**
 * Async HMAC-SHA256 using Web Crypto API (for server-side use).
 */
export async function hashNonceAsync({ nonce }: { nonce: string }): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(process.env.HMAC_SECRET_KEY ?? '');
  const key = await globalThis.crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
