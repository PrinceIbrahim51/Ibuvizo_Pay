import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSecureScreen } from '@/security/useSecureScreen';
import { useTheme } from '@/theme/ThemeContext';
import { NumberPad } from './NumberPad';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  length?: 4 | 6;
  /** Allow both 4- and 6-digit UPI PINs: shows a confirm button once 4+ digits are entered. */
  flexible?: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
};

/**
 * Secure PIN entry. The PIN lives only in this component's state, is never logged or persisted,
 * is cleared as soon as it is submitted, and screenshots/recording are blocked while it is open.
 * (In live UPI mode, this sheet is replaced by NPCI's Common Library PIN screen.)
 */
export function PinSheet({ visible, title, subtitle, length = 6, flexible, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  useSecureScreen('pin-sheet');

  useEffect(() => {
    if (!visible) setPin('');
  }, [visible]);

  const max = flexible ? 6 : length;
  const submit = (value: string) => {
    setPin('');
    onSubmit(value);
  };

  const onKey = (k: string) => {
    if (k === 'back') return setPin((p) => p.slice(0, -1));
    if (!/^\d$/.test(k)) return;
    const next = (pin + k).slice(0, max);
    setPin(next);
    if (next.length === max) submit(next);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.cardStrong }]}>
          <View style={styles.top}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {subtitle ? <Text style={{ color: theme.textMuted, marginTop: 4 }}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Cancel">
              <Ionicons name="close" size={28} color={theme.textMuted} />
            </Pressable>
          </View>
          <View style={styles.dots}>
            {Array.from({ length: max }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { borderColor: theme.primary, backgroundColor: i < pin.length ? theme.primary : 'transparent' }]}
              />
            ))}
          </View>
          {flexible && pin.length === 4 ? (
            <Pressable onPress={() => submit(pin)} style={[styles.confirm, { backgroundColor: theme.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Confirm 4-digit PIN</Text>
            </Pressable>
          ) : null}
          <View style={styles.secureRow}>
            <Ionicons name="shield-checkmark" size={16} color={theme.success} />
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>Never share your PIN with anyone, including IBUVIO staff</Text>
          </View>
          <NumberPad onKey={onKey} allowDot={false} compact />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,12,40,0.55)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, gap: 16 },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginVertical: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  confirm: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  secureRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
});
