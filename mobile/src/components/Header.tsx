import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

type Props = { title: string; subtitle?: string; back?: boolean; right?: ReactNode; center?: boolean };

export function Header({ title, subtitle, back = true, right, center }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          style={styles.circle}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
      ) : null}
      <View style={[styles.titles, center && { alignItems: 'center' }]}>
        <Text style={[styles.title, { color: theme.heroText }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.heroSubtext }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ?? (center && back ? <View style={{ width: 48 }} /> : null)}
    </View>
  );
}

export function CircleButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={styles.circle} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Ionicons name={icon} size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 6 },
  circle: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  titles: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 15, marginTop: 2 },
});
