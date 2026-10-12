import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { bankApi, savingsApi, userApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { GlassCard, HeroCard, SectionHeader } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { amountToPaise, rupee } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

const EMOJIS = ['🏍️', '📱', '✈️', '🏠', '🎓', '💍', '🚗', '🎁'];
const ROUND_TO = [10, 50, 100];

/** USP #1 "Smart Savings": every payment rounds up and the spare change goes into a goal. */
export default function Savings() {
  const { theme } = useTheme();
  const { profile, setProfile } = useAuth();
  const goals = useApi(() => savingsApi.list());
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [busy, setBusy] = useState(false);

  const totalSaved = (goals.data ?? []).reduce((s, g) => s + g.savedPaise, 0);

  const updateRoundUp = async (patch: { roundUpEnabled?: boolean; roundUpToRupees?: number }) => {
    try {
      setProfile(await userApi.update(patch));
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    }
  };

  const create = async () => {
    const paise = amountToPaise(target);
    if (!name.trim()) return Alert.alert('Goal name', 'Give your goal a name, e.g. "New bike".');
    if (!paise || paise < 10000) return Alert.alert('Target', 'Target should be at least ₹100.');
    setBusy(true);
    try {
      await savingsApi.create({ name: name.trim(), emoji, targetPaise: paise });
      setName('');
      setTarget('');
      goals.refresh();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: string) => {
    const accounts = await bankApi.list().catch(() => []);
    const primary = accounts.find((a) => a.primary);
    if (!primary) return Alert.alert('No account', 'Link a bank account first.');
    Alert.alert('Withdraw savings?', `The saved amount moves back to ${primary.bankName} ${primary.maskedNumber.slice(-4)} and the goal closes.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', onPress: () => savingsApi.withdraw(id, primary.id).then(goals.refresh).catch((e) => Alert.alert('Error', errorMessage(e))) },
    ]);
  };

  return (
    <Screen refreshing={goals.loading && !!goals.data} onRefresh={goals.refresh}>
      <Header title="Smart Savings" subtitle="Save spare change every time you pay" />
      <HeroCard>
        <Text style={{ color: '#fff', fontSize: 16 }}>Total saved</Text>
        <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>{rupee(totalSaved, { decimals: 'always' })}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Paid ₹237 → ₹3 auto-saved to your goal</Text>
      </HeroCard>

      <GlassCard style={{ gap: 12 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Round-up payments</Text>
            <Text style={{ color: theme.textMuted }}>Needs at least one active goal</Text>
          </View>
          <Switch value={!!profile?.roundUpEnabled} onValueChange={(v) => updateRoundUp({ roundUpEnabled: v })} trackColor={{ true: theme.primary }} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: theme.text, flex: 1 }}>Round up to nearest</Text>
          {ROUND_TO.map((r) => (
            <Pressable
              key={r}
              onPress={() => updateRoundUp({ roundUpToRupees: r })}
              style={[styles.pill, { borderColor: profile?.roundUpToRupees === r ? theme.primary : theme.cardBorder, backgroundColor: theme.input }]}
            >
              <Text style={{ color: theme.text, fontWeight: profile?.roundUpToRupees === r ? '700' : '400' }}>₹{r}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Your goals" />
        {goals.data?.length === 0 ? <Text style={{ color: theme.textMuted }}>Create your first goal below.</Text> : null}
        {(goals.data ?? []).map((g) => (
          <View key={g.id} style={[styles.goal, { borderBottomColor: theme.divider, opacity: g.active ? 1 : 0.5 }]}>
            <Text style={{ fontSize: 32 }}>{g.emoji ?? '🎯'}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{g.name}{g.active ? '' : ' (closed)'}</Text>
              <View style={[styles.track, { backgroundColor: theme.input }]}>
                <View style={[styles.fill, { width: `${g.percent}%`, backgroundColor: theme.success }]} />
              </View>
              <Text style={{ color: theme.textMuted }}>{rupee(g.savedPaise)} of {rupee(g.targetPaise)} • {g.percent}%</Text>
            </View>
            {g.active ? (
              <Pressable onPress={() => withdraw(g.id)} hitSlop={8}>
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Withdraw</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: 12 }}>
        <SectionHeader title="New goal" />
        <View style={styles.emojis}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, { borderColor: e === emoji ? theme.primary : 'transparent', backgroundColor: theme.input }]}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
        <Field icon="flag" label="Goal name" value={name} onChangeText={(v) => setName(sanitizeText(v, 40))} />
        <Field icon="cash" label="Target amount (₹)" value={target} onChangeText={(v) => setTarget(v.replace(/[^\d]/g, '').slice(0, 7))} keyboardType="number-pad" />
        <GradientButton title="Create goal" icon="add" onPress={create} loading={busy} />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
