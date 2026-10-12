import { initializeSslPinning, isSslPinningAvailable } from 'react-native-ssl-public-key-pinning';

import { API_URL, TLS_PINS } from '@/api/config';

/**
 * Certificate (public key) pinning: the app only talks to servers presenting one of the configured keys,
 * which defeats man-in-the-middle attacks with rogue or user-installed CA certificates.
 * Configure EXPO_PUBLIC_TLS_PINS with at least two hashes (current + backup key).
 */
export async function enableTlsPinning(): Promise<void> {
  if (TLS_PINS.length < 2 || !API_URL.startsWith('https://') || !isSslPinningAvailable()) return;
  const host = new URL(API_URL).hostname;
  await initializeSslPinning({ [host]: { includeSubdomains: false, publicKeyHashes: TLS_PINS } });
}
