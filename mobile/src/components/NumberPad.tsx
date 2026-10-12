import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

/** Glassy keypad from the Send Money design. `allowDot=false` turns the dot key into a blank (PIN entry). */
export function NumberPad({ onKey, allowDot = true, compact }: { onKey: (k: string) => void; allowDot?: boolean; compact?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.grid, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {KEYS.map((k) => {
        const disabled = k === '.' && !allowDot;
        return (
          <Pressable
            key={k}
            disabled={disabled}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onKey(k);
            }}
            accessibilityRole="button"
            accessibilityLabel={k === 'back' ? 'Delete' : k}
            style={({ pressed }) => [
              styles.key,
              compact && { height: 58 },
              { backgroundColor: disabled ? 'transparent' : theme.input, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            {k === 'back' ? (
              <Ionicons name="backspace-outline" size={30} color={theme.text} />
            ) : disabled ? null : (
              <Text style={[styles.text, { color: theme.text }]}>{k === '.' ? '•' : k}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, padding: 14, borderRadius: 28, borderWidth: 1 },
  key: { width: '31%', height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 30, fontWeight: '500' },
});
