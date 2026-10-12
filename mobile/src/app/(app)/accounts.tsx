import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { bankApi } from '@/api/endpoints';
import type { BankAccount } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { IconBadge } from '@/components/Buttons';
import { Badge, GlassCard, HeroCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { PinSheet } from '@/components/PinSheet';
import { Screen } from '@/components/Screen';
import { rupee } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { useTheme } from '@/theme/ThemeContext';
import { Alert } from '@/lib/alert';

const BANK_COLORS: Record<string, string> = { HDFC: '#E11D48', SBIN: '#1D4ED8', UTIB: '#9F1239', ICIC: '#EA580C', KKBK: '#DC2626', PUNB: '#A21CAF', CNRB: '#0369A1', IOBA: '#1E40AF', IDIB: '#0F766E' };

export default function Accounts() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const accounts = useApi(() => bankApi.list());
  const [pinFor, setPinFor] = useState<BankAccount | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const checkBalance = async (pin: string) => {
    const a = pinFor;
    setPinFor(null);
    if (!a) return;
    try {
      const r = await bankApi.balance(a.id, pin);
      setBalances((b) => ({ ...b, [a.id]: r.balancePaise }));
    } catch (e) {
      Alert.alert('Balance', errorMessage(e));
    }
  };

  const more = (a: BankAccount) =>
    Alert.alert(a.bankName, a.maskedNumber, [
      ...(a.primary ? [] : [{ text: 'Make primary', onPress: () => bankApi.makePrimary(a.id).then(accounts.refresh).catch((e) => Alert.alert('Error', errorMessage(e))) }]),
      { text: 'Change UPI PIN', onPress: () => router.push({ pathname: '/change-upi-pin', params: { id: a.id, bank: a.bankName } }) },
      {
        text: 'Remove account',
        style: 'destructive' as const,
        onPress: () => Alert.alert('Remove account?', 'You can link it again later.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => bankApi.unlink(a.id).then(accounts.refresh).catch((e) => Alert.alert('Error', errorMessage(e))) },
        ]),
      },
      { text: 'Close', style: 'cancel' as const },
    ]);

  const kycVerified = profile?.kycStatus === 'VERIFIED';

  return (
    <Screen refreshing={accounts.loading && !!accounts.data} onRefresh={accounts.refresh}>
      <Header title="Bank Accounts & UPI" subtitle="Manage your bank accounts and UPI settings" />
      <HeroCard>
        <Text style={styles.label}>Your UPI ID</Text>
        <Pressable style={styles.row} onPress={() => profile && Clipboard.setStringAsync(profile.vpa)} accessibilityLabel="Copy UPI ID">
          <Text style={styles.vpa} numberOfLines={1} adjustsFontSizeToFit>{profile?.vpa}</Text>
          <Ionicons name="copy-outline" size={22} color="#fff" />
        </Pressable>
        <View style={[styles.active, { backgroundColor: 'rgba(34,197,94,0.25)' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
          <Text style={{ color: '#fff', fontWeight: '600' }}>{accounts.data?.length ? 'Active' : 'Link a bank to activate'}</Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>This UPI ID is linked to your primary account</Text>
      </HeroCard>

      <View style={styles.quick}>
        <QuickCard icon="key" g="blue" title="UPI PIN" sub="Set or change UPI PIN" onPress={() => {
          const p = accounts.data?.find((a) => a.primary);
          if (p) router.push({ pathname: '/change-upi-pin', params: { id: p.id, bank: p.bankName } });
          else router.push('/link-account');
        }} />
        <QuickCard icon="id-card" g="purple" title="KYC Status" badge={kycVerified ? 'Verified' : 'Pending'} verified={kycVerified} onPress={() => router.push({ pathname: '/info', params: { page: 'kyc' } })} />
        <QuickCard icon="qr-code" g="green" title="My UPI IDs" sub="Copy or share UPI ID" onPress={() => profile && Clipboard.setStringAsync(profile.vpa)} />
      </View>

      <GlassCard>
        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: theme.text }]}>Linked Bank Accounts</Text>
          <Pressable onPress={() => router.push('/link-account')} style={styles.row} accessibilityRole="button">
            <Ionicons name="add" size={22} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>Add Bank Account</Text>
          </Pressable>
        </View>
        {accounts.error ? <Text style={{ color: theme.danger }}>{accounts.error}</Text> : null}
        {accounts.data?.length === 0 ? <Text style={{ color: theme.textMuted, paddingVertical: 10 }}>No bank accounts linked yet.</Text> : null}
        {(accounts.data ?? []).map((a) => (
          <View key={a.id} style={[styles.account, { borderColor: a.primary ? theme.primary : theme.cardBorder, backgroundColor: theme.cardStrong }]}>
            <View style={styles.accountTop}>
              <View style={[styles.bankLogo, { backgroundColor: BANK_COLORS[a.bankCode] ?? theme.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{a.bankCode.slice(0, 2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bankName, { color: theme.text }]}>{a.bankName}</Text>
                <Text style={{ color: theme.textMuted }}>{a.accountType === 'CURRENT' ? 'Current Account' : 'Savings Account'}</Text>
                <Text style={[styles.number, { color: theme.text }]}>{a.maskedNumber}</Text>
              </View>
              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                {a.primary ? <Badge label="Primary" tone="primary" icon="ribbon" /> : null}
                <Badge label={a.upiPinSet ? 'Verified' : 'PIN not set'} tone={a.upiPinSet ? 'success' : 'warning'} icon="checkmark-circle" />
              </View>
            </View>
            {balances[a.id] !== undefined ? (
              <Text style={{ color: theme.success, fontWeight: '700', fontSize: 18, marginTop: 6 }}>Balance: {rupee(balances[a.id], { decimals: 'always' })}</Text>
            ) : null}
            <View style={[styles.actions, { borderTopColor: theme.divider }]}>
              <Action icon="navigate-outline" label="Check Balance" onPress={() => setPinFor(a)} />
              <Action icon="business-outline" label="View Details" onPress={() => Alert.alert(a.bankName, `${a.maskedNumber}\nIFSC: ${a.ifsc}\n${a.accountType}`)} />
              <Action icon="ellipsis-horizontal" label="More" onPress={() => more(a)} />
            </View>
          </View>
        ))}
      </GlassCard>

      <GlassCard style={styles.kyc}>
        <IconBadge icon={kycVerified ? 'shield-checkmark' : 'shield-outline'} gradient={kycVerified ? 'green' : 'orange'} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{kycVerified ? 'KYC Verified' : 'KYC Pending'}</Text>
          <Text style={{ color: theme.textMuted }}>
            {kycVerified ? 'Your identity is verified and you can send, receive and make payments.' : 'Complete KYC to unlock higher limits.'}
          </Text>
        </View>
      </GlassCard>

      <PinSheet
        visible={!!pinFor}
        flexible
        title="Enter UPI PIN"
        subtitle={pinFor ? `${pinFor.bankName} ${pinFor.maskedNumber}` : undefined}
        onSubmit={checkBalance}
        onCancel={() => setPinFor(null)}
      />
    </Screen>
  );
}

function QuickCard({ icon, g, title, sub, badge, verified, onPress }: { icon: keyof typeof Ionicons.glyphMap; g: 'blue' | 'purple' | 'green'; title: string; sub?: string; badge?: string; verified?: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <GlassCard onPress={onPress} style={{ flex: 1, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <IconBadge icon={icon} gradient={g} size={52} />
        <Ionicons name="chevron-forward" size={18} color={theme.primary} />
      </View>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      {badge ? <Badge label={badge} tone={verified ? 'success' : 'warning'} icon={verified ? 'checkmark-circle' : 'time'} /> : null}
      {sub ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>{sub}</Text> : null}
    </GlassCard>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={{ color: theme.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: '#fff', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vpa: { color: '#fff', fontSize: 32, fontWeight: '800', flexShrink: 1 },
  active: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 8 },
  quick: { flexDirection: 'row', gap: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  section: { fontSize: 19, fontWeight: '700' },
  account: { borderWidth: 1.5, borderRadius: 22, padding: 14, marginTop: 10 },
  accountTop: { flexDirection: 'row', gap: 12 },
  bankLogo: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bankName: { fontSize: 18, fontWeight: '700' },
  number: { fontSize: 17, letterSpacing: 1, marginTop: 4 },
  actions: { flexDirection: 'row', borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  action: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  kyc: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
