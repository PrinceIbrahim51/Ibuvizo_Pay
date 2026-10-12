import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { digitsOnly, rules, sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

/** Pay to any bank account via UPI using the NPCI account@IFSC.ifsc.npci address format. */
export default function BankTransfer() {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [error, setError] = useState<string>();

  const next = () => {
    if (!rules.name.test(name.trim())) return setError('Enter the account holder name');
    if (!rules.accountNumber.test(account)) return setError('Account number must be 9 to 18 digits');
    if (account !== confirm) return setError('Account numbers do not match');
    if (!rules.ifsc.test(ifsc)) return setError('Enter a valid 11-character IFSC, e.g. HDFC0001234');
    router.push({
      pathname: '/send',
      params: { vpa: `${account}@${ifsc}.ifsc.npci`.toLowerCase(), name: name.trim(), channel: 'BANK_TRANSFER' },
    });
  };

  return (
    <Screen>
      <Header title="Bank Transfer" subtitle="Send to any bank account via UPI" />
      <GlassCard style={{ gap: 14 }}>
        <Field icon="person" label="Account holder name" value={name} onChangeText={(v) => setName(sanitizeText(v, 80))} autoCapitalize="words" />
        <Field icon="card" label="Account number" value={account} onChangeText={(v) => setAccount(digitsOnly(v, 18))} keyboardType="number-pad" secret />
        <Field icon="card" label="Re-enter account number" value={confirm} onChangeText={(v) => setConfirm(digitsOnly(v, 18))} keyboardType="number-pad" />
        <Field icon="business" label="IFSC code" value={ifsc} onChangeText={(v) => setIfsc(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} autoCapitalize="characters" />
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Continue" onPress={next} />
      </GlassCard>
    </Screen>
  );
}
