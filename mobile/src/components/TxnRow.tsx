import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/api/types';
import { rupee } from '@/lib/money';
import { tileGradients } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';
import { IconBadge } from './Buttons';

const CATEGORY_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; g: keyof typeof tileGradients }> = {
  MERCHANT: { icon: 'bag-handle', g: 'purple' },
  FOOD: { icon: 'restaurant', g: 'orange' },
  RECHARGE: { icon: 'call', g: 'indigo' },
  BANK: { icon: 'business', g: 'blue' },
  RECEIVED: { icon: 'arrow-down', g: 'green' },
  TRANSFER: { icon: 'arrow-up', g: 'green' },
};

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (same(d, today)) return `Today, ${date}`;
  if (same(d, yest)) return `Yesterday, ${date}`;
  return d.toLocaleDateString('en-IN', { weekday: 'short' }) + ', ' + date;
}

export function TxnRow({ t, showNote = true, onPress }: { t: Transaction; showNote?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  const credit = t.direction === 'CREDIT';
  const meta = credit ? CATEGORY_ICON.RECEIVED : (CATEGORY_ICON[t.category] ?? CATEGORY_ICON.TRANSFER);
  const statusText = t.status === 'SUCCESS' ? (credit ? 'Received' : 'Paid') : t.status === 'PENDING' ? 'Pending' : 'Failed';
  const statusColor = t.status === 'FAILED' ? theme.danger : credit ? theme.success : theme.textMuted;
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <IconBadge icon={meta.icon} gradient={meta.g} size={54} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{t.counterpartyName}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>UPI • {timeLabel(t.createdAt)}</Text>
        {showNote && t.note ? <Text style={[styles.note, { color: theme.textMuted }]} numberOfLines={1}>{t.note}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: credit ? theme.success : theme.text }]}>
          {credit ? '+ ' : '- '}{rupee(t.amountPaise)}
        </Text>
        <Text style={{ color: statusColor, fontSize: 14, marginTop: 2 }}>{statusText}</Text>
        {t.roundUpPaise > 0 ? <Text style={{ color: theme.primary, fontSize: 12 }}>+{rupee(t.roundUpPaise)} saved</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 2 },
  note: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '700' },
});
