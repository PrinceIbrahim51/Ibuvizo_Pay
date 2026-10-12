import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tileGradients } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';
import { IconBadge } from './Buttons';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  gradient: keyof typeof tileGradients;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
};

/** Settings-style row from the Profile design. */
export function ListRow({ icon, gradient, title, subtitle, onPress, right, danger, last }: Props) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }, pressed && { opacity: 0.7 }]}
    >
      <IconBadge icon={icon} gradient={gradient} size={58} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: danger ? theme.danger : theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? (
        <View style={[styles.chevron, { backgroundColor: danger ? theme.dangerBg : 'rgba(47,91,255,0.08)' }]}>
          <Ionicons name="chevron-forward" size={20} color={danger ? theme.danger : theme.primary} />
        </View>
      ) : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 3 },
  chevron: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
