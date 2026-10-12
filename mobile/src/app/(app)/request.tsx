import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { paymentApi } from '@/api/endpoints';
import { Avatar } from '@/components/Avatar';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { Badge, GlassCard, SectionHeader } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { amountToPaise, rupee } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { rules, sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';
import { Alert } from '@/lib/alert';

export default function RequestMoney() {
  const { theme } = useTheme();
  const incoming = useApi(() => paymentApi.incoming());
  const outgoing = useApi(() => paymentApi.outgoing());
  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const send = async () => {
    const paise = amountToPaise(amount);
    if (!rules.vpa.test(vpa.trim())) return setError('Enter a valid UPI ID');
    if (!paise || paise < 100) return setError('Enter an amount of at least ₹1');
    setBusy(true);
    setError(undefined);
    try {
      await paymentApi.request({ payerVpa: vpa.trim().toLowerCase(), amountPaise: paise, note: note.trim() || undefined });
      setVpa('');
      setAmount('');
      setNote('');
      outgoing.refresh();
      Alert.alert('Request sent', 'They will be asked to approve it with their UPI PIN.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const decline = (id: string) =>
    paymentApi.decline(id).then(incoming.refresh).catch((e) => Alert.alert('Error', errorMessage(e)));

  return (
    <Screen>
      <Header title="Request Money" subtitle="Ask friends or customers to pay you" />
      <GlassCard style={{ gap: 12 }}>
        <Field icon="at" label="Their UPI ID" placeholder="name@ibuvio" value={vpa} onChangeText={(v) => setVpa(v.replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 80))} />
        <Field icon="cash" label="Amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, '').slice(0, 9))} keyboardType="decimal-pad" />
        <Field icon="chatbox" label="Note (optional)" value={note} onChangeText={(v) => setNote(sanitizeText(v, 60))} />
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Send request" onPress={send} loading={busy} />
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Requests to you" />
        {incoming.data?.length === 0 ? <Text style={{ color: theme.textMuted }}>No requests.</Text> : null}
        {(incoming.data ?? []).map((r) => (
          <View key={r.id} style={[styles.row, { borderBottomColor: theme.divider }]}>
            <Avatar name={r.counterpartyName} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{r.counterpartyName}</Text>
              <Text style={{ color: theme.textMuted }}>{rupee(r.amountPaise)}{r.note ? ` • ${r.note}` : ''}</Text>
            </View>
            {r.status === 'PENDING' ? (
              <View style={{ gap: 6 }}>
                <Pressable
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={() => router.push({ pathname: '/send', params: { vpa: r.counterpartyVpa, name: r.counterpartyName, amount: String(r.amountPaise), note: r.note ?? '', channel: 'REQUEST', requestId: r.id } })}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Pay</Text>
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: theme.dangerBg }]} onPress={() => decline(r.id)}>
                  <Text style={{ color: theme.danger, fontWeight: '700' }}>Decline</Text>
                </Pressable>
              </View>
            ) : (
              <Badge label={r.status} tone={r.status === 'PAID' ? 'success' : 'warning'} />
            )}
          </View>
        ))}
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Your requests" />
        {outgoing.data?.length === 0 ? <Text style={{ color: theme.textMuted }}>You haven't requested money yet.</Text> : null}
        {(outgoing.data ?? []).map((r) => (
          <View key={r.id} style={[styles.row, { borderBottomColor: theme.divider }]}>
            <Avatar name={r.counterpartyName} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{r.counterpartyName}</Text>
              <Text style={{ color: theme.textMuted }}>{rupee(r.amountPaise)}</Text>
            </View>
            <Badge label={r.status} tone={r.status === 'PAID' ? 'success' : r.status === 'PENDING' ? 'primary' : 'warning'} />
          </View>
        ))}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
});
