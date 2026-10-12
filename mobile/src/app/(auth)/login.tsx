import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { biometricEnabled, lastPhone } from '@/auth/secureSession';
import { AuthShell } from '@/components/AuthShell';
import { GradientButton, OutlineButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { useCountdown } from '@/lib/useCountdown';
import { digitsOnly, rules } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';
import { Alert } from '@/lib/alert';

export default function Login() {
  const { theme } = useTheme();
  const { requestOtp, login, unlockWithBiometrics } = useAuth();
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [bioAvailable, setBioAvailable] = useState(false);
  const countdown = useCountdown();

  useEffect(() => {
    lastPhone().then((p) => p && setPhone(p.replace('+91', ''))).catch(() => {});
    biometricEnabled().then(setBioAvailable).catch(() => {});
  }, []);

  const sendOtp = async () => {
    if (!rules.phone10.test(phone)) return setError('Enter a valid 10-digit mobile number');
    setBusy(true);
    setError(undefined);
    try {
      setChallengeId(await requestOtp('+91' + phone, 'LOGIN'));
      countdown.start(30);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!challengeId) return sendOtp();
    if (!rules.otp.test(otp)) return setError('Enter the 6-digit OTP sent to your phone');
    if (!rules.mpin.test(mpin)) return setError('Enter your 6-digit MPIN');
    setBusy(true);
    setError(undefined);
    try {
      await login('+91' + phone, challengeId, otp, mpin);
    } catch (e) {
      setError(errorMessage(e));
      setOtp('');
      setMpin('');
    } finally {
      setBusy(false);
    }
  };

  const biometric = async () => {
    if (!bioAvailable) {
      Alert.alert('Biometric sign-in', 'Sign in once with OTP and MPIN, then turn on biometric unlock in Profile → Security.');
      return;
    }
    const ok = await unlockWithBiometrics();
    if (!ok) setError('Biometric sign-in failed. Please sign in with OTP and MPIN.');
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue with IBUVIO">
      <Field
        icon="call"
        label="Enter your mobile number"
        prefix="+91"
        value={phone}
        onChangeText={(v) => {
          setPhone(digitsOnly(v, 10));
          setChallengeId(null);
        }}
        keyboardType="number-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={10}
      />
      {challengeId ? (
        <>
          <Field
            icon="chatbubble-ellipses"
            label="6-digit OTP"
            value={otp}
            onChangeText={(v) => setOtp(digitsOnly(v, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
          />
          <Field
            icon="lock-closed"
            placeholder="Enter your 6-digit MPIN"
            value={mpin}
            onChangeText={(v) => setMpin(digitsOnly(v, 6))}
            keyboardType="number-pad"
            secret
            maxLength={6}
          />
        </>
      ) : null}
      <View style={styles.linksRow}>
        {challengeId ? (
          <Pressable disabled={countdown.left > 0} onPress={sendOtp} hitSlop={8}>
            <Text style={{ color: countdown.left > 0 ? theme.textMuted : theme.primary, fontSize: 15 }}>
              {countdown.left > 0 ? `Resend OTP in ${countdown.left}s` : 'Resend OTP'}
            </Text>
          </Pressable>
        ) : <View />}
        <Pressable onPress={() => router.push('/forgot-mpin')} hitSlop={8}>
          <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Forgot MPIN?</Text>
        </Pressable>
      </View>
      {error ? <Text style={{ color: theme.danger, textAlign: 'center' }}>{error}</Text> : null}
      <GradientButton title={challengeId ? 'Sign in' : 'Continue'} onPress={submit} loading={busy} />
      {Platform.OS === 'web' ? null : <Pressable onPress={biometric} style={[styles.bioRow, { backgroundColor: theme.input, borderColor: theme.cardBorder }]} accessibilityRole="button">
        <View style={styles.bioIcon}><Ionicons name="finger-print" size={32} color={theme.primary} /></View>
        <Text style={{ flex: 1, fontSize: 18, color: theme.text }}>Sign in with biometrics</Text>
        <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
      </Pressable>}
      <View style={styles.orRow}>
        <View style={[styles.line, { backgroundColor: theme.divider }]} />
        <Text style={{ color: theme.textMuted, fontWeight: '600' }}>OR</Text>
        <View style={[styles.line, { backgroundColor: theme.divider }]} />
      </View>
      <OutlineButton title="Create new account" onPress={() => router.push('/register')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, borderWidth: 1, padding: 12 },
  bioIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(47,91,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1 },
});
