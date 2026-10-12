import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/** Filter pills from the Transactions design (All / Sent / Received / Pending). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={styles.flex} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            {active ? (
              <LinearGradient colors={['#3B82F6', '#2F5BFF']} style={styles.pill}>
                <Text style={[styles.text, { color: '#fff' }]}>{o.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.pill, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }]}>
                <Text style={[styles.text, { color: theme.text }]}>{o.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  pill: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '600' },
});
