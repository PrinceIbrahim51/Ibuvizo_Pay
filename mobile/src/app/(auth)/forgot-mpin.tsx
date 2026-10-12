import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { errorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { digitsOnly, isWeakPin, rules } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

export default function ForgotMpin() {
  const { theme } = useTheme();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setError(undefined);
    setBusy(true);
    try {
      if (!challengeId) {
        if (!rules.phone10.test(phone)) throw new Error('Enter a valid 10-digit mobile number');
        setChallengeId(await requestOtp('+91' + phone, 'RESET_MPIN'));
        return;
      }
      if (!rules.otp.test(otp)) throw new Error('Enter the 6-digit OTP');
      if (!rules.mpin.test(mpin) || isWeakPin(mpin)) throw new Error('Choose a stronger 6-digit MPIN');
      await authApi.resetMpin({ phone: '+91' + phone, challengeId, otp, newMpin: mpin });
      Alert.alert('MPIN updated', 'You have been signed out of all devices. Sign in with your new MPIN.');
      router.back();
    } catch (e) {
      setError(e instanceof Error && !('status' in e) ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset MPIN" subtitle="We'll verify it's you with an OTP">
      <Field icon="call" label="Registered mobile number" prefix="+91" value={phone} onChangeText={(v) => setPhone(digitsOnly(v, 10))} keyboardType="number-pad" maxLength={10} />
      {challengeId ? (
        <>
          <Field icon="chatbubble-ellipses" label="6-digit OTP" value={otp} onChangeText={(v) => setOtp(digitsOnly(v, 6))} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} />
          <Field icon="lock-closed" placeholder="New 6-digit MPIN" value={mpin} onChangeText={(v) => setMpin(digitsOnly(v, 6))} keyboardType="number-pad" secret maxLength={6} />
        </>
      ) : null}
      {error ? <Text style={{ color: theme.danger, textAlign: 'center' }}>{error}</Text> : null}
      <GradientButton title={challengeId ? 'Reset MPIN' : 'Send OTP'} onPress={submit} loading={busy} />
    </AuthShell>
  );
}
