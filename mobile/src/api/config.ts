const raw: string = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://10.0.2.2:8080' : '');

/**
 * Release builds refuse to talk to anything but HTTPS. (Android also blocks cleartext at the OS level via
 * usesCleartextTraffic=false and iOS App Transport Security does the same.)
 */
if (!__DEV__ && !raw.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL must be an https:// URL in release builds');
}

export const API_URL = raw.replace(/\/+$/, '');

/** Optional TLS public-key pins (base64 SHA-256 of SPKI). At least two (primary + backup) are required on iOS. */
export const TLS_PINS: string[] = (process.env.EXPO_PUBLIC_TLS_PINS ?? '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

export const REQUEST_TIMEOUT_MS = 15_000;
