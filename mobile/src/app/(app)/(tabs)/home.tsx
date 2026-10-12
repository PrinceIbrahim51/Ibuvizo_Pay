import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { bankApi, paymentApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { IconBadge } from '@/components/Buttons';
import { Badge, GlassCard, HeroCard, SectionHeader } from '@/components/Glass';
import { Logo } from '@/components/Logo';
import { PinSheet } from '@/components/PinSheet';
import { Screen } from '@/components/Screen';
import { TxnRow } from '@/components/TxnRow';
import { rupee } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import type { tileGradients } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

type Tile = { icon: keyof typeof Ionicons.glyphMap; g: keyof typeof tileGradients; title: string; sub: string; go: () => void };

export default function Home() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const recent = useApi(() => paymentApi.history('ALL', '', 0));
  const contacts = useApi(() => paymentApi.recentContacts());
  const summary = useApi(() => paymentApi.summary());
  const accounts = useApi(() => bankApi.list());
  const [balance, setBalance] = useState<number | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  const primary = accounts.data?.find((a) => a.primary);

  const revealBalance = () => {
    if (balance !== null) return setBalance(null);
    if (!primary) return router.push('/link-account');
    setPinOpen(true);
  };

  const checkBalance = async (pin: string) => {
    setPinOpen(false);
    if (!primary) return;
    try {
      const r = await bankApi.balance(primary.id, pin);
      setBalance(r.balancePaise);
      setTimeout(() => setBalance(null), 30_000); // auto-hide after 30 s
    } catch (e) {
      Alert.alert('Balance', errorMessage(e));
    }
  };

  const tiles: Tile[] = [
    { icon: 'paper-plane', g: 'blue', title: 'Send', sub: 'To anyone', go: () => router.push('/pay-upi-id') },
    { icon: 'qr-code', g: 'purple', title: 'Scan & Pay', sub: 'QR payment', go: () => router.push('/pay') },
    { icon: 'download', g: 'green', title: 'Request', sub: 'Ask for money', go: () => router.push('/request') },
    { icon: 'business', g: 'orange', title: 'Bank Transfer', sub: 'To bank account', go: () => router.push('/bank-transfer') },
  ];

  const smart: Tile[] = [
    { icon: 'mic', g: 'pink', title: 'Voice Pay', sub: 'Tamil • हिंदी • EN', go: () => router.push('/voice') },
    { icon: 'storefront', g: 'teal', title: 'Shop Books', sub: profile?.businessMode ? 'Today\'s P&L' : 'Set up shop', go: () => router.push(profile?.businessMode ? '/shop' : '/shop/setup') },
    { icon: 'leaf', g: 'indigo', title: 'Smart Savings', sub: summary.data?.roundUpSavedPaise ? `${rupee(summary.data.roundUpSavedPaise)} this month` : 'Round-up saving', go: () => router.push('/savings') },
  ];

  const utilities: { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }[] = [
    { icon: 'phone-portrait-outline', color: '#2563EB', bg: 'rgba(37,99,235,0.10)', label: 'Mobile\nRecharge' },
    { icon: 'bulb', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)', label: 'Electricity\nBill' },
    { icon: 'wifi', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', label: 'DTH /\nBroadband' },
    { icon: 'shield', color: '#E11D48', bg: 'rgba(225,29,72,0.10)', label: 'Insurance' },
    { icon: 'gift', color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Offers\n& Rewards' },
  ];

  const refreshAll = () => {
    recent.refresh();
    contacts.refresh();
    summary.refresh();
    accounts.refresh();
  };

  return (
    <Screen withTabBar refreshing={recent.loading && !!recent.data} onRefresh={refreshAll}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Logo size={34} />
          <Text style={styles.greeting}>Good to see you again{profile ? `, ${profile.fullName.split(' ')[0]}` : ''}!</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Profile">
          <Avatar name={profile?.fullName ?? '?'} size={72} online />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/pay-upi-id')} style={styles.search} accessibilityRole="search">
        <Ionicons name="search" size={24} color="#fff" />
        <Text style={styles.searchText}>Search contacts, payees or services...</Text>
        <Pressable onPress={() => router.push('/pay')} hitSlop={8} accessibilityLabel="Scan QR">
          <Ionicons name="scan" size={24} color="#fff" />
        </Pressable>
      </Pressable>

      <HeroCard>
        <Pressable onPress={() => router.push('/accounts')} style={styles.cardArrow} accessibilityLabel="Bank accounts">
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={revealBalance} style={styles.balanceLabel} accessibilityRole="button" accessibilityLabel="Show balance">
          <Text style={styles.cardLabel}>{primary ? `${primary.bankName} balance` : 'Total Balance'}</Text>
          <Ionicons name={balance === null ? 'eye' : 'eye-off'} size={20} color="#fff" />
        </Pressable>
        <Text style={styles.balance}>{balance === null ? '₹ ••••••' : rupee(balance, { decimals: 'always' })}</Text>
        <View style={styles.chip}>
          <Ionicons name="trending-up" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {summary.data ? `Spent ${rupee(summary.data.spentPaise)} this month` : 'Tap the eye to check balance'}
          </Text>
        </View>
      </HeroCard>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <GlassCard key={t.title} onPress={t.go} style={styles.tile}>
            <IconBadge icon={t.icon} gradient={t.g} size={62} />
            <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit>{t.title}</Text>
            <Text style={[styles.tileSub, { color: theme.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>{t.sub}</Text>
          </GlassCard>
        ))}
      </View>

      <GlassCard>
        <SectionHeader title="IBUVIO Smart" />
        <View style={styles.smartRow}>
          {smart.map((t) => (
            <Pressable key={t.title} onPress={t.go} style={[styles.smart, { backgroundColor: theme.input }]} accessibilityRole="button">
              <IconBadge icon={t.icon} gradient={t.g} size={46} />
              <Text style={[styles.smartTitle, { color: theme.text }]}>{t.title}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>{t.sub}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Recent Contacts" action="See all" onAction={() => router.push('/pay-upi-id')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18 }}>
          {(contacts.data ?? []).map((c) => (
            <Pressable
              key={c.vpa}
              style={styles.contact}
              onPress={() => router.push({ pathname: '/send', params: { vpa: c.vpa, name: c.name, channel: 'CONTACT' } })}
            >
              <Avatar name={c.name} size={64} />
              <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.contact} onPress={() => router.push('/pay-upi-id')} accessibilityLabel="Add payee">
            <View style={[styles.add, { backgroundColor: theme.input }]}>
              <Ionicons name="add" size={32} color={theme.primary} />
            </View>
            <Text style={{ color: theme.text, fontSize: 14 }}>Add</Text>
          </Pressable>
        </ScrollView>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Quick Utilities" />
        <View style={styles.utilRow}>
          {utilities.map((u) => (
            <Pressable
              key={u.label}
              style={styles.util}
              onPress={() => Alert.alert('Coming soon', 'Bill payments will be available once our BBPS partnership is live.')}
            >
              <View style={[styles.utilIcon, { backgroundColor: u.bg }]}>
                <Ionicons name={u.icon} size={28} color={u.color} />
              </View>
              <Text style={{ color: theme.text, fontSize: 12, textAlign: 'center' }}>{u.label}</Text>
            </Pressable>
          ))}
        </View>
        <Badge label="Coming soon" tone="warning" icon="time" />
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Recent Transactions" action="See all" onAction={() => router.push('/history')} />
        {recent.data && recent.data.content.length === 0 ? (
          <Text style={{ color: theme.textMuted, paddingVertical: 12 }}>No transactions yet. Link a bank account and make your first payment!</Text>
        ) : null}
        {recent.error ? <Text style={{ color: theme.danger }}>{recent.error}</Text> : null}
        {(recent.data?.content ?? []).slice(0, 3).map((t) => (
          <TxnRow key={t.id} t={t} showNote={false} onPress={() => router.push({ pathname: '/receipt', params: { id: t.id } })} />
        ))}
      </GlassCard>

      <PinSheet
        visible={pinOpen}
        flexible
        title="Enter UPI PIN"
        subtitle={primary ? `${primary.bankName} ${primary.maskedNumber}` : undefined}
        onSubmit={checkBalance}
        onCancel={() => setPinOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  greeting: { color: 'rgba(255,255,255,0.9)', fontSize: 17, marginTop: 6 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderRadius: 30, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 16 },
  cardArrow: { position: 'absolute', right: 0, top: 4, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  balanceLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLabel: { color: '#fff', fontSize: 17 },
  balance: { color: '#fff', fontSize: 38, fontWeight: '800', marginVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 2, paddingVertical: 14, gap: 4 },
  tileTitle: { fontSize: 14, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  tileSub: { fontSize: 11, textAlign: 'center' },
  smartRow: { flexDirection: 'row', gap: 10 },
  smart: { flex: 1, borderRadius: 20, padding: 12, gap: 6, alignItems: 'flex-start' },
  smartTitle: { fontSize: 14, fontWeight: '700' },
  contact: { alignItems: 'center', gap: 6, width: 70 },
  add: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  utilRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  util: { alignItems: 'center', gap: 8, width: '19%' },
  utilIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
