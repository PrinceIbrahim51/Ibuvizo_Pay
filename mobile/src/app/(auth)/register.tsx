import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { useCountdown } from '@/lib/useCountdown';
import { digitsOnly, isWeakPin, rules, sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

export default function Register() {
  const { theme } = useTheme();
  const { requestOtp, register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [mpin2, setMpin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const countdown = useCountdown();

  const sendOtp = async () => {
    if (!rules.name.test(name.trim())) return setError('Enter your full name (letters only)');
    if (!rules.phone10.test(phone)) return setError('Enter a valid 10-digit mobile number');
    setBusy(true);
    setError(undefined);
    try {
      setChallengeId(await requestOtp('+91' + phone, 'REGISTER'));
      countdown.start(30);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!challengeId) return sendOtp();
    if (!rules.otp.test(otp)) return setError('Enter the 6-digit OTP');
    if (!rules.mpin.test(mpin) || isWeakPin(mpin)) return setError('Choose a 6-digit MPIN without repeated or sequential digits');
    if (mpin !== mpin2) return setError('MPINs do not match');
    setBusy(true);
    setError(undefined);
    try {
      await register('+91' + phone, challengeId, otp, name.trim(), mpin);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Join IBUVIO in under a minute">
      <Field icon="person" label="Full name (as per bank)" value={name} onChangeText={(v) => setName(sanitizeText(v, 80))} autoCapitalize="words" textContentType="name" />
      <Field
        icon="call"
        label="Mobile number linked to your bank"
        prefix="+91"
        value={phone}
        onChangeText={(v) => { setPhone(digitsOnly(v, 10)); setChallengeId(null); }}
        keyboardType="number-pad"
        maxLength={10}
      />
      {challengeId ? (
        <>
          <Field icon="chatbubble-ellipses" label="6-digit OTP" value={otp} onChangeText={(v) => setOtp(digitsOnly(v, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} />
          <Field icon="lock-closed" placeholder="Create 6-digit MPIN" value={mpin} onChangeText={(v) => setMpin(digitsOnly(v, 6))} keyboardType="number-pad" secret maxLength={6} />
          <Field icon="lock-closed" placeholder="Confirm MPIN" value={mpin2} onChangeText={(v) => setMpin2(digitsOnly(v, 6))} keyboardType="number-pad" secret maxLength={6} />
          <Pressable disabled={countdown.left > 0} onPress={sendOtp}>
            <Text style={{ color: countdown.left > 0 ? theme.textMuted : theme.primary }}>
              {countdown.left > 0 ? `Resend OTP in ${countdown.left}s` : 'Resend OTP'}
            </Text>
          </Pressable>
        </>
      ) : null}
      {error ? <Text style={{ color: theme.danger, textAlign: 'center' }}>{error}</Text> : null}
      <GradientButton title={challengeId ? 'Create account' : 'Send OTP'} onPress={submit} loading={busy} />
      <Pressable onPress={() => router.back()} style={{ alignItems: 'center' }}>
        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Already have an account? Sign in</Text>
      </Pressable>
    </AuthShell>
  );
}
