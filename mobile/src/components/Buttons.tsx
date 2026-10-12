import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { tileGradients } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'send';
  style?: StyleProp<ViewStyle>;
};

export function GradientButton({ title, onPress, disabled, loading, icon = 'arrow-forward', variant = 'primary', style }: ButtonProps) {
  const { theme } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [styles.shadow, { opacity: inactive ? 0.55 : pressed ? 0.9 : 1 }, style]}
    >
      <LinearGradient
        colors={variant === 'send' ? theme.sendGradient : theme.primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.title}>{title}</Text>
            {variant === 'primary' ? (
              <View style={styles.iconBubble}><Ionicons name={icon} size={22} color="#fff" /></View>
            ) : (
              <Ionicons name={icon} size={22} color="#fff" style={{ marginLeft: 8 }} />
            )}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, style, tone = 'primary' }: { title: string; onPress: () => void; style?: StyleProp<ViewStyle>; tone?: 'primary' | 'danger' }) {
  const { theme } = useTheme();
  const color = tone === 'danger' ? theme.danger : theme.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.outline, { borderColor: color, backgroundColor: theme.card, opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Text style={[styles.outlineText, { color }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={color} style={styles.outlineChevron} />
    </Pressable>
  );
}

/** Square gradient icon used in tiles and list rows. */
export function IconBadge({ icon, gradient = 'blue', size = 56 }: { icon: keyof typeof Ionicons.glyphMap; gradient?: keyof typeof tileGradients; size?: number }) {
  return (
    <LinearGradient colors={tileGradients[gradient]} style={[styles.badge, { width: size, height: size, borderRadius: size * 0.32 }]}>
      <Ionicons name={icon} size={size * 0.46} color="#fff" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 999, shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  button: { height: 64, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  iconBubble: { position: 'absolute', right: 10, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  outline: { height: 60, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  outlineText: { fontSize: 18, fontWeight: '700' },
  outlineChevron: { position: 'absolute', right: 22 },
  badge: { alignItems: 'center', justifyContent: 'center' },
});
