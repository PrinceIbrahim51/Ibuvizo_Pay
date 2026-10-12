import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { shopApi } from '@/api/endpoints';
import type { LedgerEntry } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { GradientButton, IconBadge } from '@/components/Buttons';
import { Badge, GlassCard, HeroCard, SectionHeader } from '@/components/Glass';
import { CircleButton, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { addDays, isoDate } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { rupee } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { useTheme } from '@/theme/ThemeContext';
import { Alert } from '@/lib/alert';

/** USP: "UPI for Small Shops" - every UPI receipt lands in the books automatically; cash sales by voice or tap. */
export default function ShopHome() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const lang = profile?.preferredLanguage ?? 'en';
  const today = isoDate(new Date());
  const shop = useApi(() => shopApi.profile());
  const daily = useApi(() => shopApi.daily(today), [today]);
  const entries = useApi(() => shopApi.entries(today), [today]);
  const week = useApi(() => shopApi.range(isoDate(addDays(new Date(), -6)), today), [today]);

  const refresh = () => {
    daily.refresh();
    entries.refresh();
    week.refresh();
  };

  const d = daily.data;
  const profit = d?.profitPaise ?? 0;
  const maxBar = Math.max(1, ...(week.data ?? []).map((w) => Math.max(w.incomePaise, w.expensePaise)));

  const remove = (e: LedgerEntry) => {
    if (e.source === 'UPI') return Alert.alert('UPI entry', 'Entries from UPI payments are recorded automatically and cannot be deleted.');
    Alert.alert('Delete entry?', `${e.type === 'INCOME' ? 'Sale' : 'Expense'} of ${rupee(e.amountPaise)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => shopApi.deleteEntry(e.id).then(refresh).catch((err) => Alert.alert('Error', errorMessage(err))) },
    ]);
  };

  const shareSummary = () => {
    if (!d) return;
    Share.share({
      message: `${shop.data?.shopName ?? 'My shop'} • ${today}\n${t('income', lang)}: ${rupee(d.incomePaise)}\n${t('expense', lang)}: ${rupee(d.expensePaise)}\n${profit >= 0 ? t('profit', lang) : t('loss', lang)}: ${rupee(Math.abs(profit))}\n— IBUVIO Shop Books`,
    }).catch(() => {});
  };

  return (
    <Screen refreshing={daily.loading && !!daily.data} onRefresh={refresh}>
      <Header
        title={shop.data?.shopName ?? 'My Shop'}
        subtitle={shop.data?.gstin ? `GSTIN ${shop.data.gstin}` : t('todaysBooks', lang)}
        right={<CircleButton icon="settings-outline" label="Shop settings" onPress={() => router.push('/shop/setup')} />}
      />
      <HeroCard>
        <Text style={{ color: '#fff', fontSize: 16 }}>{t('todaysBooks', lang)}</Text>
        <Text style={styles.profit}>{profit < 0 ? '- ' : ''}{rupee(Math.abs(profit), { decimals: 'always' })}</Text>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{profit >= 0 ? t('profit', lang) : t('loss', lang)}</Text>
        <View style={styles.split}>
          <View style={{ flex: 1 }}>
            <Text style={styles.splitLabel}>{t('income', lang)}</Text>
            <Text style={styles.splitValue}>{rupee(d?.incomePaise ?? 0)}</Text>
            <Text style={styles.splitSub}>UPI {rupee(d?.incomeByMode?.UPI ?? 0)} • Cash {rupee(d?.incomeByMode?.CASH ?? 0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.splitLabel}>{t('expense', lang)}</Text>
            <Text style={styles.splitValue}>{rupee(d?.expensePaise ?? 0)}</Text>
            <Text style={styles.splitSub}>{d?.entries ?? 0} entries today</Text>
          </View>
        </View>
      </HeroCard>

      <Pressable onPress={() => router.push('/voice')} accessibilityRole="button">
        <GlassCard style={styles.voice}>
          <IconBadge icon="mic" gradient="pink" size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>{t('speakToAdd', lang)}</Text>
            <Text style={{ color: theme.textMuted }}>“ஐநூறு ரூபாய் விற்பனை” • “800 का माल खरीदा”</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.primary} />
        </GlassCard>
      </Pressable>

      <View style={styles.actions}>
        <GlassCard onPress={() => router.push({ pathname: '/shop/entry', params: { type: 'INCOME' } })} style={styles.action}>
          <IconBadge icon="add" gradient="green" size={50} />
          <Text style={{ color: theme.text, fontWeight: '700' }}>{t('addSale', lang)}</Text>
        </GlassCard>
        <GlassCard onPress={() => router.push({ pathname: '/shop/entry', params: { type: 'EXPENSE' } })} style={styles.action}>
          <IconBadge icon="remove" gradient="orange" size={50} />
          <Text style={{ color: theme.text, fontWeight: '700' }}>{t('addExpense', lang)}</Text>
        </GlassCard>
        <GlassCard onPress={() => router.push('/shop/gst')} style={styles.action}>
          <IconBadge icon="document-text" gradient="indigo" size={50} />
          <Text style={{ color: theme.text, fontWeight: '700' }}>{t('gstReport', lang)}</Text>
        </GlassCard>
      </View>

      <GlassCard>
        <SectionHeader title={t('last7', lang)} />
        <View style={styles.chart}>
          {(week.data ?? []).map((w) => (
            <View key={w.date} style={styles.barCol}>
              <View style={styles.bars}>
                <View style={[styles.bar, { height: Math.max(2, (w.incomePaise / maxBar) * 110), backgroundColor: theme.success }]} />
                <View style={[styles.bar, { height: Math.max(2, (w.expensePaise / maxBar) * 110), backgroundColor: '#FB923C' }]} />
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>{new Date(w.date).toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <Badge label={t('income', lang)} tone="success" />
          <Badge label={t('expense', lang)} tone="warning" />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title={t('entries', lang)} action="Share" onAction={shareSummary} />
        {entries.data?.length === 0 ? <Text style={{ color: theme.textMuted }}>{t('noEntries', lang)}</Text> : null}
        {(entries.data ?? []).map((e) => (
          <Pressable key={e.id} onLongPress={() => remove(e)} onPress={() => remove(e)} style={[styles.entry, { borderBottomColor: theme.divider }]}>
            <IconBadge icon={e.type === 'INCOME' ? 'arrow-down' : 'arrow-up'} gradient={e.type === 'INCOME' ? 'green' : 'orange'} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{e.note || e.category}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                {e.paymentMode} • {e.source === 'VOICE' ? '🎙 voice' : e.source === 'UPI' ? 'auto (UPI)' : 'manual'}{e.gstRate ? ` • GST ${e.gstRate}%` : ''}
              </Text>
            </View>
            <Text style={{ color: e.type === 'INCOME' ? theme.success : theme.text, fontWeight: '800', fontSize: 16 }}>
              {e.type === 'INCOME' ? '+' : '-'}{rupee(e.amountPaise)}
            </Text>
          </Pressable>
        ))}
      </GlassCard>
      <GradientButton title="Share today's summary" icon="share-social" onPress={shareSummary} disabled={!d} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profit: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 4 },
  split: { flexDirection: 'row', gap: 12, marginTop: 14 },
  splitLabel: { color: 'rgba(255,255,255,0.85)' },
  splitValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  splitSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { alignItems: 'center', gap: 6, flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderRadius: 5 },
  legend: { flexDirection: 'row', gap: 8, marginTop: 10 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
});
