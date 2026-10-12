import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { bankApi } from '@/api/endpoints';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { PinSheet } from '@/components/PinSheet';
import { Screen } from '@/components/Screen';
import { useApi } from '@/lib/useApi';
import { digitsOnly, isWeakPin, rules } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

export default function LinkAccount() {
  const { theme } = useTheme();
  const banks = useApi(() => bankApi.banks());
  const [bank, setBank] = useState<string>();
  const [number, setNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [type, setType] = useState<'SAVINGS' | 'CURRENT'>('SAVINGS');
  const [step, setStep] = useState<'form' | 'pin' | 'confirm'>('form');
  const [firstPin, setFirstPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const next = () => {
    if (!bank) return setError('Choose your bank');
    if (!rules.accountNumber.test(number)) return setError('Account number must be 9 to 18 digits');
    if (!rules.ifsc.test(ifsc) || !ifsc.startsWith(bank)) return setError(`Enter a valid IFSC for this bank (starts with ${bank})`);
    setError(undefined);
    setStep('pin');
  };

  const onPin = async (pin: string) => {
    if (step === 'pin') {
      if (isWeakPin(pin)) {
        setStep('form');
        return setError('UPI PIN is too easy to guess. Avoid repeated or sequential digits.');
      }
      setFirstPin(pin);
      setStep('confirm');
      return;
    }
    if (pin !== firstPin) {
      setStep('form');
      setFirstPin('');
      return setError('UPI PINs did not match. Try again.');
    }
    setStep('form');
    setBusy(true);
    try {
      await bankApi.link({ bankCode: bank!, accountNumber: number, ifsc, accountType: type, upiPin: pin });
      setFirstPin('');
      Alert.alert('Account linked', 'Your bank account is ready for UPI payments.');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Add Bank Account" subtitle="Link an account for UPI payments" />
      <GlassCard style={{ gap: 14 }}>
        <Text style={[styles.label, { color: theme.text }]}>Choose your bank</Text>
        <View style={styles.banks}>
          {(banks.data ?? []).map((b) => (
            <Pressable
              key={b.code}
              onPress={() => { setBank(b.code); setIfsc(b.code); }}
              style={[styles.bank, { backgroundColor: theme.input, borderColor: bank === b.code ? theme.primary : theme.cardBorder }]}
            >
              <Text style={{ color: theme.text, fontWeight: bank === b.code ? '700' : '500' }}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
        <Field icon="card" label="Account number" value={number} onChangeText={(v) => setNumber(digitsOnly(v, 18))} keyboardType="number-pad" secret />
        <Field icon="business" label="IFSC" value={ifsc} onChangeText={(v) => setIfsc(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} autoCapitalize="characters" />
        <View style={styles.types}>
          {(['SAVINGS', 'CURRENT'] as const).map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.bank, { flex: 1, alignItems: 'center', backgroundColor: theme.input, borderColor: type === t ? theme.primary : theme.cardBorder }]}>
              <Text style={{ color: theme.text, fontWeight: type === t ? '700' : '500' }}>{t === 'SAVINGS' ? 'Savings' : 'Current'}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Continue & set UPI PIN" onPress={next} loading={busy} />
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Sandbox mode: no real bank is contacted. In production, account discovery and UPI PIN setup happen through your bank via NPCI.
        </Text>
      </GlassCard>
      <PinSheet
        visible={step !== 'form'}
        flexible
        title={step === 'pin' ? 'Set a new UPI PIN' : 'Confirm UPI PIN'}
        subtitle="4 or 6 digits"
        onSubmit={onPin}
        onCancel={() => { setStep('form'); setFirstPin(''); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 17, fontWeight: '700' },
  banks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bank: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1.5 },
  types: { flexDirection: 'row', gap: 10 },
});
