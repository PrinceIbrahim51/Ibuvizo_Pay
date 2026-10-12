import { usePreventScreenCapture } from 'expo-screen-capture';
import { Platform } from 'react-native';

/**
 * Blocks screenshots / screen recording (Android FLAG_SECURE, iOS capture protection) while mounted.
 * Platform.OS never changes at runtime, so the conditional hook call is stable.
 */
export const useSecureScreen: (key: string) => void =
  Platform.OS === 'web' ? () => {} : (key: string) => usePreventScreenCapture(key);
