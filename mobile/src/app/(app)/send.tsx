import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/client';
import { bankApi, paymentApi, userApi } from '@/api/endpoints';
import type { BankAccount, Channel } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { GradientButton } from '@/components/Buttons';
import { GlassCard, HeroCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { NumberPad } from '@/components/NumberPad';
import { PinSheet } from '@/components/PinSheet';
import { Screen } from '@/components/Screen';
import { amountToPaise, applyKey, formatRupees } from '@/lib/money';
import { sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

const CHANNELS: Channel[] = ['VPA', 'QR', 'CONTACT', 'VOICE', 'REQUEST', 'BANK_TRANSFER'];

export default function SendMoney() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ vpa: string; name?: string; amount?: string; note?: string; channel?: string; requestId?: string }>();
  const channel: Channel = CHANNELS.includes(params.channel as Channel) ? (params.channel as Channel) : 'VPA';
  const fixedAmount = !!params.amount && (channel === 'QR' || channel === 'REQUEST');

  const [amount, setAmount] = useState(params.amount ? formatRupees(Number(params.amount)).replace(/,/g, '') : '');
  const [note, setNote] = useState(sanitizeText(params.note ?? ''));
  const [payee, setPayee] = useState<{ name: string; verified: boolean }>({ name: params.name || params.vpa, verified: false });
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState<string>();
  const [pinOpen, setPinOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [businessExpense, setBusinessExpense] = useState(false);
  // One idempotency key per payment attempt: a retry after a timeout can never debit twice.
  const idemKey = useRef(paymentApi.newIdempotencyKey());

  useEffect(() => {
    userApi.lookupVpa(params.vpa)
      // For QR / typed IDs always show the bank-registered name, never the name embedded in a QR (spoofable).
      .then((r) => setPayee({ name: channel === 'CONTACT' && params.name ? params.name : r.name, verified: true }))
      .catch(() => setPayee((p) => ({ ...p, verified: false })));
    bankApi.list().then((list) => {
      setAccounts(list);
      setAccountId(list.find((a) => a.primary)?.id ?? list[0]?.id);
    }).catch(() => {});
  }, [params.vpa]);

  const paise = amountToPaise(amount);
  const account = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);

  const start = () => {
    if (!paise || paise < 100) return Alert.alert('Enter amount', 'Minimum amount is ₹1.');
    if (!account) {
      return Alert.alert('No bank account', 'Link a bank account to start paying.', [
        { text: 'Link now', onPress: () => router.push('/link-account') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
    if (!payee.verified && channel !== 'BANK_TRANSFER') {
      // Unknown payee (e.g. another UPI app): extra confirmation step to reduce fraud.
      return Alert.alert('Confirm payee', `You are paying ${params.vpa}. Make sure you trust this UPI ID.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => setPinOpen(true) },
      ]);
    }
    setPinOpen(true);
  };

  const pay = async (upiPin: string) => {
    setPinOpen(false);
    if (!paise || !account) return;
    setBusy(true);
    try {
      const txn = await paymentApi.pay({
        payeeVpa: params.vpa,
        payeeName: payee.verified ? undefined : (params.name || undefined),
        amountPaise: paise,
        note: note.trim() || undefined,
        accountId: account.id,
        upiPin,
        channel,
        businessExpense: profile?.businessMode ? businessExpense : undefined,
        moneyRequestId: params.requestId || undefined,
      }, idemKey.current);
      router.replace({ pathname: '/receipt', params: { id: txn.id, fresh: '1' } });
    } catch (e) {
      // Only a definite rejection gets a fresh key; on network errors the same key makes the retry safe.
      if (e instanceof ApiError && e.status > 0) idemKey.current = paymentApi.newIdempotencyKey();
      Alert.alert('Payment not completed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Send Money" subtitle="Pay anyone, anytime with IBUVIO" />
      <HeroCard>
        <View style={styles.payee}>
          <Avatar name={payee.name} size={84} online={payee.verified} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.payeeName} numberOfLines={1}>{payee.name}</Text>
              {payee.verified ? <Ionicons name="checkmark-circle" size={22} color="#93C5FD" /> : null}
            </View>
            <Pressable style={styles.nameRow} onPress={() => Clipboard.setStringAsync(params.vpa)} accessibilityLabel="Copy UPI ID">
              <Text style={styles.vpa} numberOfLines={1}>{params.vpa}</Text>
              <Ionicons name="copy-outline" size={18} color="#fff" />
            </Pressable>
            <View style={styles.nameRow}>
              <Ionicons name={payee.verified ? 'shield-checkmark' : 'alert-circle'} size={18} color={payee.verified ? '#4ADE80' : '#FCD34D'} />
              <Text style={{ color: '#fff' }}>{payee.verified ? 'UPI Verified' : 'Not on IBUVIO • verify before paying'}</Text>
            </View>
          </View>
        </View>
      </HeroCard>

      <GlassCard style={{ padding: 18 }}>
        <View style={[styles.amountBox, { backgroundColor: theme.input }]}>
          <Text style={[styles.enter, { color: theme.textMuted }]}>Enter Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.rupee, { color: theme.text }]}>₹</Text>
            <Text style={[styles.amount, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {displayAmount(amount)}
            </Text>
            <View style={[styles.caret, { backgroundColor: theme.primary }]} />
          </View>
        </View>
        <View style={[styles.note, { backgroundColor: theme.input }]}>
          <Ionicons name="chatbox-outline" size={24} color={theme.textMuted} />
          <TextInput
            value={note}
            onChangeText={(v) => setNote(sanitizeText(v, 60))}
            placeholder="Add a note (optional)"
            placeholderTextColor={theme.textMuted}
            style={{ flex: 1, fontSize: 17, color: theme.text }}
            maxLength={60}
          />
        </View>
        {accounts.length > 1 ? (
          <View style={styles.accounts}>
            {accounts.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => setAccountId(a.id)}
                style={[styles.accountChip, { borderColor: a.id === accountId ? theme.primary : theme.cardBorder, backgroundColor: theme.input }]}
              >
                <Text style={{ color: theme.text, fontWeight: a.id === accountId ? '700' : '400' }}>{a.bankName.split(' ')[0]} •{a.maskedNumber.slice(-4)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {profile?.businessMode ? (
          <Pressable onPress={() => setBusinessExpense((b) => !b)} style={styles.bizRow} accessibilityRole="checkbox" accessibilityState={{ checked: businessExpense }}>
            <Ionicons name={businessExpense ? 'checkbox' : 'square-outline'} size={22} color={theme.primary} />
            <Text style={{ color: theme.text }}>Business expense (add to shop books)</Text>
          </Pressable>
        ) : null}
      </GlassCard>

      {fixedAmount ? null : <NumberPad onKey={(k) => setAmount((a) => applyKey(a, k))} />}

      <GradientButton title="Send Money" variant="send" onPress={start} loading={busy} disabled={!paise} />
      <View style={styles.safe}>
        <Ionicons name="shield-checkmark" size={24} color={theme.success} />
        <Text style={{ color: theme.textMuted, fontSize: 15 }}>Your money is safe with IBUVIO</Text>
      </View>

      <PinSheet
        visible={pinOpen}
        flexible
        title={`Pay ₹${formatRupees(paise ?? 0)}`}
        subtitle={`To ${payee.name} • from ${account?.bankName ?? ''} ${account?.maskedNumber.slice(-4) ?? ''}`}
        onSubmit={pay}
        onCancel={() => setPinOpen(false)}
      />
    </Screen>
  );
}

/** Groups the rupee part while keeping exactly what was typed after the decimal point ("12.0" stays "12.0"). */
function displayAmount(raw: string): string {
  if (!raw) return '0';
  const [rupees, decimals] = raw.split('.');
  return formatRupees(Number(rupees || '0') * 100) + (decimals !== undefined ? '.' + decimals : '');
}

const styles = StyleSheet.create({
  payee: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  payeeName: { color: '#fff', fontSize: 22, fontWeight: '800', flexShrink: 1 },
  vpa: { color: '#fff', fontSize: 16, flexShrink: 1 },
  amountBox: { borderRadius: 22, padding: 16 },
  enter: { fontSize: 18, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rupee: { fontSize: 44, fontWeight: '800' },
  amount: { fontSize: 64, fontWeight: '800', flexShrink: 1 },
  caret: { width: 3, height: 60, borderRadius: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: 16, marginTop: 12 },
  accounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  accountChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  safe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
