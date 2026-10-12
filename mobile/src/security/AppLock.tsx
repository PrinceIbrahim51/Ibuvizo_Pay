import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { GradientButton } from '@/components/Buttons';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/theme/ThemeContext';

/** Lock the app after it has been in the background for this long. */
const LOCK_AFTER_MS = 60_000;

export function useAutoLock() {
  const { status, lock } = useAuth();
  const backgroundedAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active' && backgroundedAt.current) {
        if (status === 'signedIn' && Date.now() - backgroundedAt.current > LOCK_AFTER_MS) lock();
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [status, lock]);
}

/** Full-screen overlay shown when the session is locked. Unlock with biometrics / device passcode, or sign in again. */
export function LockScreen() {
  const { theme } = useTheme();
  const { resume, logout } = useAuth();

  const unlock = async () => {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHw && (await LocalAuthentication.isEnrolledAsync());
    if (!enrolled) {
      await logout(); // no device security set up: fall back to full OTP + MPIN login
      return;
    }
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock IBUVIO', disableDeviceFallback: false });
    if (r.success) resume();
  };

  useEffect(() => {
    unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={theme.hero} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Logo size={44} tagline="Locked for your safety" />
        <Ionicons name="lock-closed" size={64} color="#fff" style={{ marginVertical: 32 }} />
        <GradientButton title="Unlock" icon="finger-print" onPress={unlock} style={{ alignSelf: 'stretch' }} />
        <Pressable onPress={logout} style={{ marginTop: 20 }} accessibilityRole="button">
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign in with OTP instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
