import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Thin storage layer.
 * - iOS/Android: Keychain / Keystore via expo-secure-store.
 * - Web: secrets (session tokens) go to sessionStorage: they survive a page refresh but are wiped when the
 *   tab closes and are never shared with other tabs or persisted on shared computers. The strict
 *   Content-Security-Policy (script-src 'self') blocks injected scripts that could read them.
 *   Non-secret preferences (device id, last phone, theme) use localStorage.
 */
const isWeb = Platform.OS === 'web';

export type StoreOptions = SecureStore.SecureStoreOptions & { secret?: boolean };

function web(secret?: boolean): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return secret ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export async function getItem(key: string, opts: StoreOptions = {}): Promise<string | null> {
  if (!isWeb) return SecureStore.getItemAsync(key, opts);
  return web(opts.secret)?.getItem(key) ?? null;
}

export async function setItem(key: string, value: string, opts: StoreOptions = {}): Promise<void> {
  if (!isWeb) return SecureStore.setItemAsync(key, value, opts);
  web(opts.secret)?.setItem(key, value);
}

export async function deleteItem(key: string, opts: StoreOptions = {}): Promise<void> {
  if (!isWeb) return SecureStore.deleteItemAsync(key, opts);
  web(true)?.removeItem(key);
  web(false)?.removeItem(key);
}

export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
