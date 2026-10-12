import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

type Props = Omit<TextInputProps, 'style'> & {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  prefix?: string;
  secret?: boolean;
  error?: string;
};

/** Input row from the login design: rounded field with an icon pill on the left. */
export function Field({ icon, label, prefix, secret, error, ...input }: Props) {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View>
      <View style={[styles.row, { backgroundColor: theme.input, borderColor: error ? theme.danger : theme.cardBorder }]}>
        <View style={styles.iconPill}>
          <Ionicons name={icon} size={24} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {prefix ? <Text style={[styles.input, { color: theme.text, marginRight: 6 }]}>{prefix}</Text> : null}
            <TextInput
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, flex: 1 }]}
              secureTextEntry={secret ? hidden : false}
              autoCorrect={false}
              autoCapitalize="none"
              importantForAutofill={secret ? 'no' : 'auto'}
              contextMenuHidden={secret}
              {...input}
            />
          </View>
        </View>
        {secret ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show' : 'Hide'}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={26} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, minHeight: 74 },
  iconPill: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(47,91,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13 },
  input: { fontSize: 18, paddingVertical: 2 },
  error: { marginTop: 6, marginLeft: 12, fontSize: 13 },
});
