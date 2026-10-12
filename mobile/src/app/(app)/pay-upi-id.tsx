import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { paymentApi, userApi } from '@/api/endpoints';
import { Avatar } from '@/components/Avatar';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { GlassCard, SectionHeader } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { useApi } from '@/lib/useApi';
import { rules } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

/** "Send to anyone": search recent payees or type any UPI ID, which is verified before paying. */
export default function PayUpiId() {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const contacts = useApi(() => paymentApi.recentContacts());

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (contacts.data ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.vpa.includes(q));
  }, [contacts.data, query]);

  const proceed = async () => {
    const vpa = query.trim().toLowerCase();
    if (!rules.vpa.test(vpa)) return setError('Enter a valid UPI ID, e.g. name@bank');
    setBusy(true);
    setError(undefined);
    try {
      const r = await userApi.lookupVpa(vpa).catch(() => null);
      router.push({ pathname: '/send', params: { vpa, name: r?.name ?? '', channel: 'VPA' } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Send Money" subtitle="Search a contact or enter a UPI ID" />
      <GlassCard style={{ gap: 14 }}>
        <Field
          icon="at"
          label="UPI ID or name"
          placeholder="name@bank"
          value={query}
          onChangeText={(v) => setQuery(v.replace(/[^a-zA-Z0-9@._\- ]/g, '').slice(0, 80))}
          autoFocus
          error={error}
        />
        <GradientButton title="Verify & continue" onPress={proceed} loading={busy} disabled={!query.includes('@')} />
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Recent payees" />
        {filtered.length === 0 ? <Text style={{ color: theme.textMuted }}>No recent payees yet.</Text> : null}
        {filtered.map((c) => (
          <Pressable
            key={c.vpa}
            style={[styles.row, { borderBottomColor: theme.divider }]}
            onPress={() => router.push({ pathname: '/send', params: { vpa: c.vpa, name: c.name, channel: 'CONTACT' } })}
          >
            <Avatar name={c.name} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{c.name}</Text>
              <Text style={{ color: theme.textMuted }}>{c.vpa}</Text>
            </View>
          </Pressable>
        ))}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
});
