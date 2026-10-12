import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { errorMessage } from '@/api/client';
import { bankApi } from '@/api/endpoints';
import { GradientButton } from '@/components/Buttons';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { PinSheet } from '@/components/PinSheet';
import { Screen } from '@/components/Screen';
import { isWeakPin } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

export default function ChangeUpiPin() {
  const { theme } = useTheme();
  const { id, bank } = useLocalSearchParams<{ id: string; bank: string }>();
  const [step, setStep] = useState<'idle' | 'current' | 'new' | 'confirm'>('idle');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string>();

  const onPin = async (pin: string) => {
    if (step === 'current') {
      setCurrent(pin);
      return setStep('new');
    }
    if (step === 'new') {
      if (isWeakPin(pin)) {
        setStep('idle');
        return setError('New UPI PIN is too easy to guess.');
      }
      setNext(pin);
      return setStep('confirm');
    }
    setStep('idle');
    if (pin !== next) return setError('New PINs did not match.');
    try {
      await bankApi.changePin(id, current, pin);
      Alert.alert('UPI PIN changed', `Your ${bank} UPI PIN has been updated.`);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCurrent('');
      setNext('');
    }
  };

  const titles = { idle: '', current: 'Enter current UPI PIN', new: 'Enter new UPI PIN', confirm: 'Confirm new UPI PIN' };

  return (
    <Screen>
      <Header title="UPI PIN" subtitle={bank} />
      <GlassCard style={{ gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Change the UPI PIN used to approve payments from this account.</Text>
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Change UPI PIN" icon="key" onPress={() => { setError(undefined); setStep('current'); }} />
      </GlassCard>
      <PinSheet visible={step !== 'idle'} flexible title={titles[step]} onSubmit={onPin} onCancel={() => setStep('idle')} />
    </Screen>
  );
}
