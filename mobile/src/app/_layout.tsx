import * as ScreenCapture from 'expo-screen-capture';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { LockScreen, useAutoLock } from '@/security/AppLock';
import { enableTlsPinning } from '@/security/tlsPinning';
import { useSecureScreen } from '@/security/useSecureScreen';
import { palettes } from '@/theme/palette';
import { ThemeProvider } from '@/theme/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    enableTlsPinning().catch(() => {});
    // Blur the app in the iOS app switcher so balances/PINs are not visible in the task snapshot.
    if (Platform.OS === 'ios') ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { status } = useAuth();
  useAutoLock();
  // Android FLAG_SECURE for the whole app: blocks screenshots, screen recording and overlay capture.
  useSecureScreen('app');

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <LinearGradient colors={palettes.aurora.hero} style={StyleSheet.absoluteFill} />
        <Logo size={52} tagline="Fast, secure UPI payments" />
        <ActivityIndicator color="#fff" style={{ marginTop: 32 }} />
      </View>
    );
  }

  const signedIn = status === 'signedIn' || status === 'locked';
  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {status === 'locked' ? <LockScreen /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
