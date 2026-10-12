import { StyleSheet, Text, View } from 'react-native';

import { initials } from '@/lib/validation';

const COLORS = ['#C7D2FE', '#DDD6FE', '#BAE6FD', '#BBF7D0', '#FED7AA', '#FBCFE8'];
const TEXT = ['#4338CA', '#6D28D9', '#0369A1', '#15803D', '#C2410C', '#BE185D'];

/** Colourful initials avatar (no remote images, so no tracking pixels or untrusted URLs are ever loaded). */
export function Avatar({ name, size = 64, online }: { name: string; size?: number; online?: boolean }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const i = hash % COLORS.length;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS[i] }]}>
        <Text style={{ color: TEXT[i], fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
      </View>
      {online ? <View style={[styles.dot, { width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  dot: { position: 'absolute', right: 0, bottom: 2, backgroundColor: '#22C55E', borderWidth: 2.5, borderColor: '#fff' },
});
