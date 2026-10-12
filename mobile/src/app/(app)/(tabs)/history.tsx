import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { paymentApi } from '@/api/endpoints';
import type { MonthSummary, Transaction } from '@/api/types';
import { GlassCard, HeroCard } from '@/components/Glass';
import { CircleButton } from '@/components/Header';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TxnRow, dayLabel } from '@/components/TxnRow';
import { rupee } from '@/lib/money';
import { sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

type Filter = 'ALL' | 'SENT' | 'RECEIVED' | 'PENDING';

export default function History() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    try {
      const next = reset ? 0 : page + 1;
      const r = await paymentApi.history(filter, query.trim(), next);
      setItems((prev) => (reset ? r.content : [...prev, ...r.content]));
      setPage(next);
      setHasMore(next + 1 < r.page.totalPages);
      setError(undefined);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [filter, query, page]);

  // Debounced reload when the filter or search text changes.
  useEffect(() => {
    const t = setTimeout(() => load(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  useFocusEffect(useCallback(() => {
    paymentApi.summary().then(setSummary).catch(() => {});
  }, []));

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of items) {
      const key = dayLabel(t.createdAt);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <Screen withTabBar refreshing={loading && page === 0} onRefresh={() => load(true)}>
      <View style={styles.header}>
        <CircleButton icon="chevron-back" label="Back" onPress={() => router.navigate('/home')} />
        <Logo size={36} />
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={24} color="#fff" />
        <TextInput
          value={query}
          onChangeText={(v) => setQuery(sanitizeText(v, 40))}
          placeholder="Search by name, number or merchant..."
          placeholderTextColor="rgba(255,255,255,0.8)"
          style={styles.searchInput}
        />
        <Ionicons name="scan" size={24} color="#fff" />
      </View>

      <HeroCard>
        <Text style={styles.month}>This Month ⌄</Text>
        <View style={styles.split}>
          <SummaryCol label="Total Spent" paise={summary?.spentPaise} pct={summary?.spentChangePct} bad />
          <View style={styles.vline} />
          <SummaryCol label="Total Received" paise={summary?.receivedPaise} pct={summary?.receivedChangePct} />
        </View>
      </HeroCard>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'SENT', label: 'Sent' },
          { value: 'RECEIVED', label: 'Received' },
          { value: 'PENDING', label: 'Pending' },
        ]}
      />

      {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      {!loading && items.length === 0 ? (
        <GlassCard><Text style={{ color: theme.textMuted, textAlign: 'center' }}>No transactions found.</Text></GlassCard>
      ) : null}
      {groups.map(([day, list]) => (
        <GlassCard key={day} style={{ paddingVertical: 8 }}>
          <Text style={[styles.day, { color: theme.text }]}>{day}</Text>
          {list.map((t) => (
            <TxnRow key={t.id} t={t} onPress={() => router.push({ pathname: '/receipt', params: { id: t.id } })} />
          ))}
        </GlassCard>
      ))}
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {hasMore && !loading && items.length > 0 ? (
        <Pressable onPress={() => load(false)} style={{ alignItems: 'center', padding: 12 }}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Load more</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function SummaryCol({ label, paise, pct, bad }: { label: string; paise?: number; pct?: number; bad?: boolean }) {
  const up = (pct ?? 0) >= 0;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: '#fff', fontSize: 15 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit>
        {paise === undefined ? '—' : rupee(paise, { decimals: 'always' })}
      </Text>
      {pct !== undefined && pct !== null ? (
        <View style={styles.pctRow}>
          <View style={[styles.pct, { backgroundColor: (up === !!bad) ? 'rgba(244,63,94,0.25)' : 'rgba(34,197,94,0.25)' }]}>
            <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700' }}>{Math.abs(pct)}%</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>vs last month</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 8 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderRadius: 30, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  month: { color: '#fff', fontSize: 16, marginBottom: 10 },
  split: { flexDirection: 'row', gap: 16 },
  vline: { width: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pct: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  day: { fontSize: 17, fontWeight: '700', marginTop: 8 },
});
