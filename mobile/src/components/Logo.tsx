import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

/** IBUVIO wordmark with the ribbon mark from the design. */
export function Logo({ size = 40, tagline }: { size?: number; tagline?: string }) {
  return (
    <View>
      <View style={styles.row}>
        <View style={{ width: size, height: size }}>
          <LinearGradient
            colors={['#38BDF8', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bar, { width: size * 0.42, height: size, borderRadius: size * 0.18, transform: [{ skewX: '-18deg' }] }]}
          />
          <LinearGradient
            colors={['#A78BFA', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bar, { left: size * 0.5, width: size * 0.42, height: size * 0.8, top: size * 0.2, borderRadius: size * 0.18, transform: [{ skewX: '-18deg' }] }]}
          />
        </View>
        <Text style={[styles.word, { fontSize: size * 0.9 }]}>IBUVIO</Text>
      </View>
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { position: 'absolute', left: 0, top: 0, opacity: 0.95 },
  word: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: 6 },
});
