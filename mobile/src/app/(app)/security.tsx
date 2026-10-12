import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { biometricEnabled } from '@/auth/secureSession';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeContext';

export default function Security() {
  const { theme } = useTheme();
  const { setBiometric, logoutEverywhere } = useAuth();
  const [bio, setBio] = useState(false);

  useEffect(() => {
    biometricEnabled().then(setBio).catch(() => {});
  }, []);

  const toggleBio = async (on: boolean) => {
    if (on) {
      const enrolled = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) return Alert.alert('Biometrics unavailable', 'Set up fingerprint or Face ID in your phone settings first.');
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to enable biometric sign-in' });
      if (!r.success) return;
    }
    await setBiometric(on);
    setBio(on);
  };

  const signOutAll = () =>
    Alert.alert('Sign out everywhere?', 'All devices, including this one, will need OTP and MPIN to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out all', style: 'destructive', onPress: () => logoutEverywhere() },
    ]);

  return (
    <Screen>
      <Header title="Security" subtitle="Protect your account" />
      <GlassCard style={{ paddingVertical: 4 }}>
        <ListRow
          icon="finger-print"
          gradient="purple"
          title="Biometric sign-in"
          subtitle="Use fingerprint / Face ID to unlock"
          right={<Switch value={bio} onValueChange={toggleBio} trackColor={{ true: theme.primary }} />}
        />
        <ListRow icon="key" gradient="blue" title="UPI PIN" subtitle="Change UPI PIN for a linked account" onPress={() => router.push('/accounts')} />
        <ListRow icon="lock-closed" gradient="indigo" title="Change MPIN" subtitle="Reset via OTP on your registered number" onPress={() => Alert.alert('Change MPIN', 'Sign out, then use "Forgot MPIN?" on the sign-in screen. For your safety this signs you out of all devices.')} />
        <ListRow icon="phone-portrait" gradient="pink" title="Sign out of all devices" subtitle="If you lost a phone or suspect misuse" onPress={signOutAll} last />
      </GlassCard>
      <GlassCard style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>Built-in protections</Text>
        {[
          'Two-factor sign-in: OTP on your SIM + 6-digit MPIN',
          'Sessions stored in the phone\'s secure hardware (Keychain / Keystore)',
          'App locks automatically after 1 minute in the background',
          'Screenshots and screen recording are blocked',
          'Encrypted HTTPS only, with optional certificate pinning',
          'UPI PIN is blocked after 3 wrong attempts',
        ].map((line) => (
          <Text key={line} style={{ color: theme.textMuted }}>• {line}</Text>
        ))}
      </GlassCard>
    </Screen>
  );
}
