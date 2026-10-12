import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { paymentApi } from '@/api/endpoints';
import { GradientButton } from '@/components/Buttons';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { rupee } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { useTheme } from '@/theme/ThemeContext';

export default function Receipt() {
  const { theme } = useTheme();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data: t, error } = useApi(() => paymentApi.get(id), [id]);

  const share = () => {
    if (!t) return;
    Share.share({
      message: `IBUVIO payment ${t.status === 'SUCCESS' ? 'successful' : t.status.toLowerCase()}\n${rupee(t.amountPaise)} ${t.direction === 'DEBIT' ? 'to' : 'from'} ${t.counterpartyName}\nUPI Ref: ${t.upiRef}\n${new Date(t.createdAt).toLocaleString('en-IN')}`,
    }).catch(() => {});
  };

  return (
    <Screen>
      <Header title={fresh ? 'Payment done' : 'Transaction details'} back={!fresh} />
      {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      {t ? (
        <GlassCard style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <View style={[styles.check, { backgroundColor: t.status === 'SUCCESS' ? theme.success : theme.warning }]}>
            <Ionicons name={t.status === 'SUCCESS' ? 'checkmark' : 'time'} size={52} color="#fff" />
          </View>
          <Text style={[styles.amount, { color: theme.text }]}>{rupee(t.amountPaise)}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>
            {t.direction === 'DEBIT' ? 'Paid to' : 'Received from'} <Text style={{ color: theme.text, fontWeight: '700' }}>{t.counterpartyName}</Text>
          </Text>
          <Text style={{ color: theme.textMuted }}>{t.counterpartyVpa}</Text>
          {t.roundUpPaise > 0 ? (
            <View style={[styles.saved, { backgroundColor: theme.successBg }]}>
              <Ionicons name="leaf" size={16} color={theme.success} />
              <Text style={{ color: theme.success, fontWeight: '700' }}>{rupee(t.roundUpPaise)} auto-saved to your goal</Text>
            </View>
          ) : null}
          <View style={[styles.details, { borderTopColor: theme.divider }]}>
            <Row label="UPI Ref No." value={t.upiRef} copy />
            <Row label="Date & time" value={new Date(t.createdAt).toLocaleString('en-IN')} />
            {t.note ? <Row label="Note" value={t.note} /> : null}
            <Row label="Status" value={t.status} />
          </View>
        </GlassCard>
      ) : null}
      <GradientButton title="Share receipt" icon="share-social" onPress={share} disabled={!t} />
      {fresh ? (
        <Pressable onPress={() => router.replace('/home')} style={{ alignItems: 'center', padding: 12 }}>
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 17 }}>Back to Home</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.textMuted }}>{label}</Text>
      <Pressable disabled={!copy} onPress={() => Clipboard.setStringAsync(value)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontWeight: '600' }}>{value}</Text>
        {copy ? <Ionicons name="copy-outline" size={16} color={theme.textMuted} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 44, fontWeight: '800' },
  saved: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  details: { alignSelf: 'stretch', borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
