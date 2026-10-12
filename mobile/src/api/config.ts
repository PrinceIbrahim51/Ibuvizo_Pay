import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * - Web build: the API is served from the same domain under /api (Vercel rewrite), so the base URL is ''.
 *   Same-origin means no CORS and the browser's CSP can stay at connect-src 'self'.
 * - Native release builds refuse anything but HTTPS (Android also blocks cleartext via
 *   usesCleartextTraffic=false and iOS App Transport Security does the same).
 */
const raw: string = process.env.EXPO_PUBLIC_API_URL ?? (isWeb ? '' : __DEV__ ? 'http://10.0.2.2:8080' : '');

if (!__DEV__ && !isWeb && !raw.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL must be an https:// URL in release builds');
}

export const API_URL = raw.replace(/\/+$/, '');

/** Optional TLS public-key pins (base64 SHA-256 of SPKI). At least two (primary + backup) are required on iOS. */
export const TLS_PINS: string[] = (process.env.EXPO_PUBLIC_TLS_PINS ?? '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

export const REQUEST_TIMEOUT_MS = 20_000;
