import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { errorMessage } from '@/api/client';
import { shopApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { GradientButton } from '@/components/Buttons';
import { Chips } from '@/components/Chips';
import { Field } from '@/components/Field';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { t } from '@/lib/i18n';
import { amountToPaise } from '@/lib/money';
import { sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

const SALE_CATS = ['SALES', 'SERVICES', 'OTHER'] as const;
const EXPENSE_CATS = ['STOCK', 'RENT', 'SALARY', 'UTILITIES', 'TRANSPORT', 'OTHER'] as const;
const MODES = ['CASH', 'UPI', 'CARD', 'CREDIT'] as const;
const GST = [0, 5, 12, 18, 28] as const;
const pretty = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export default function ShopEntry() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const lang = profile?.preferredLanguage ?? 'en';
  const { type } = useLocalSearchParams<{ type: 'INCOME' | 'EXPENSE' }>();
  const sale = type !== 'EXPENSE';
  const cats = sale ? SALE_CATS : EXPENSE_CATS;
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(cats[0]);
  const [mode, setMode] = useState<(typeof MODES)[number]>('CASH');
  const [gst, setGst] = useState<(typeof GST)[number]>(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    const paise = amountToPaise(amount);
    if (!paise || paise < 100) return setError('Enter an amount of at least ₹1');
    setBusy(true);
    setError(undefined);
    try {
      await shopApi.addEntry({ type: sale ? 'INCOME' : 'EXPENSE', amountPaise: paise, gstRate: gst, category, paymentMode: mode, note: note.trim() || undefined });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={sale ? t('addSale', lang) : t('addExpense', lang)} />
      <GlassCard style={{ gap: 14 }}>
        <Field icon="cash" label="Amount (₹, including GST)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, '').slice(0, 10))} keyboardType="decimal-pad" autoFocus />
        <Text style={{ color: theme.text, fontWeight: '700' }}>Category</Text>
        <Chips options={cats as readonly string[]} value={category} onChange={setCategory} format={pretty} />
        <Text style={{ color: theme.text, fontWeight: '700' }}>Paid by</Text>
        <Chips options={MODES} value={mode} onChange={setMode} format={pretty} />
        <Text style={{ color: theme.text, fontWeight: '700' }}>GST rate</Text>
        <Chips options={GST} value={gst} onChange={setGst} format={(g) => `${g}%`} />
        <Field icon="create" label="Note (optional)" value={note} onChangeText={(v) => setNote(sanitizeText(v, 100))} />
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Save" icon="checkmark" onPress={save} loading={busy} />
      </GlassCard>
    </Screen>
  );
}
