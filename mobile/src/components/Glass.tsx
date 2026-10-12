import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export function GlassCard({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const { theme } = useTheme();
  const cardStyle = [styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

/** The glossy gradient card used for balance, UPI ID and profile headers. */
export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.heroWrap, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(140,120,255,0.38)', 'rgba(80,200,255,0.30)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.wave1} />
      <View style={styles.wave2} />
      <View style={styles.heroInner}>{children}</View>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.sectionAction} accessibilityRole="button">
          <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>{action}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'success', icon }: { label: string; tone?: 'success' | 'primary' | 'warning' | 'danger'; icon?: keyof typeof Ionicons.glyphMap }) {
  const { theme } = useTheme();
  const colors = {
    success: { bg: theme.successBg, fg: theme.success },
    primary: { bg: 'rgba(47,91,255,0.14)', fg: theme.primary },
    warning: { bg: 'rgba(245,158,11,0.15)', fg: '#B45309' },
    danger: { bg: theme.dangerBg, fg: theme.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      {icon ? <Ionicons name={icon} size={14} color={colors.fg} /> : null}
      <Text style={{ color: colors.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#3B4BC8',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(90,90,230,0.35)',
  },
  heroInner: { padding: 18 },
  wave1: { position: 'absolute', right: -40, top: -30, width: 220, height: 220, borderRadius: 110, borderWidth: 18, borderColor: 'rgba(255,255,255,0.12)' },
  wave2: { position: 'absolute', right: 30, bottom: -90, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(120,220,255,0.25)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
});
