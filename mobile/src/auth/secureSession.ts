import * as SecureStore from '@/lib/secureStorage';
import { randomUUID } from 'expo-crypto';

/**
 * Storage rules:
 *  - Access token: memory only (never persisted).
 *  - Refresh token: iOS Keychain / Android Keystore-backed SecureStore, bound to this device
 *    (THIS_DEVICE_ONLY, so it is excluded from backups and cannot be restored onto another phone).
 *  - With biometric unlock on, the refresh token is stored behind requireAuthentication, so reading it
 *    needs Face ID / fingerprint.
 */
const REFRESH = 'ibuvio.refresh';
const REFRESH_BIO = 'ibuvio.refresh.bio';
const DEVICE = 'ibuvio.device';
const PHONE = 'ibuvio.phone';
const BIO_ENABLED = 'ibuvio.bio';

const base: SecureStore.StoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
/** Session tokens: memory-only on web. */
const secret: SecureStore.StoreOptions = { ...base, secret: true };
const bio: SecureStore.StoreOptions = {
  secret: true,
  ...base,
  requireAuthentication: true,
  authenticationPrompt: 'Unlock IBUVIO',
};

export async function deviceId(): Promise<string> {
  let id = await SecureStore.getItem(DEVICE, base);
  if (!id) {
    id = randomUUID();
    await SecureStore.setItem(DEVICE, id, base);
  }
  return id;
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (await biometricEnabled()) {
    await SecureStore.setItem(REFRESH_BIO, token, bio);
    await SecureStore.deleteItem(REFRESH, secret);
  } else {
    await SecureStore.setItem(REFRESH, token, secret);
  }
}

/** Plain (non-biometric) refresh token, used for silent session restore. */
export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItem(REFRESH, secret);
}

/** Triggers the OS biometric prompt. Returns null when cancelled or not enrolled. */
export async function readBiometricRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItem(REFRESH_BIO, bio);
  } catch {
    return null;
  }
}

export async function biometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItem(BIO_ENABLED, base)) === '1';
}

export async function setBiometricEnabled(on: boolean, currentRefresh: string | null): Promise<void> {
  if (on) {
    await SecureStore.setItem(BIO_ENABLED, '1', base);
    if (currentRefresh) await saveRefreshToken(currentRefresh);
  } else {
    await SecureStore.deleteItem(BIO_ENABLED, base);
    await SecureStore.deleteItem(REFRESH_BIO, bio).catch(() => {});
    if (currentRefresh) await SecureStore.setItem(REFRESH, currentRefresh, secret);
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItem(REFRESH, secret).catch(() => {});
  await SecureStore.deleteItem(REFRESH_BIO, bio).catch(() => {});
}

export async function rememberPhone(phone: string) {
  await SecureStore.setItem(PHONE, phone, base);
}

export async function lastPhone(): Promise<string | null> {
  return SecureStore.getItem(PHONE, base);
}
