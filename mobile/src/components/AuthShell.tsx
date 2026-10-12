import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { Logo } from './Logo';
import { Screen } from './Screen';

/** Hero + floating glass card layout shared by Login, Register and Forgot MPIN (design 01). */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <Screen contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.hero}>
        <View style={{ flex: 1, gap: 18 }}>
          <Logo size={46} tagline="Fast, secure UPI payments" />
          <Text style={styles.headline}>Smarter payments for a brighter you.</Text>
          <Text style={styles.sub}>Pay, receive, scan, and more with IBUVIO.</Text>
          <View style={styles.pager}>
            <View style={[styles.pageDot, { width: 36, backgroundColor: '#fff' }]} />
            <View style={styles.pageDot} />
            <View style={styles.pageDot} />
          </View>
        </View>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(160,180,255,0.35)']} style={styles.phone}>
            <Ionicons name="paper-plane" size={52} color="#fff" />
          </LinearGradient>
          <FloatTile icon="arrow-up" colors={['#4ADE80', '#16A34A']} style={{ top: 0, left: 10 }} />
          <FloatTile icon="qr-code" colors={['#A5B4FC', '#6366F1']} style={{ top: 8, right: 0 }} />
          <FloatTile icon="logo-usd" text="₹" colors={['#60A5FA', '#2563EB']} style={{ bottom: 30, left: -6 }} />
          <View style={styles.ring} />
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: theme.cardStrong, borderColor: theme.cardBorder }]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        <View style={{ gap: 16, marginTop: 20 }}>{children}</View>
        <View style={styles.trust}>
          <Ionicons name="shield-checkmark" size={30} color={theme.success} />
          <Text style={{ color: theme.textMuted, flex: 1, fontSize: 14 }}>
            Your data is protected with bank-grade security encryption. Safe. Secure. Always.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function FloatTile({ icon, text, colors, style }: { icon: keyof typeof Ionicons.glyphMap; text?: string; colors: readonly [string, string]; style: object }) {
  return (
    <LinearGradient colors={colors} style={[styles.tile, style]}>
      {text ? <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{text}</Text> : <Ionicons name={icon} size={26} color="#fff" />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, minHeight: 330 },
  headline: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 38, marginTop: 18 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 16 },
  pager: { flexDirection: 'row', gap: 8, marginTop: 6 },
  pageDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.45)' },
  art: { width: 140, alignItems: 'center', justifyContent: 'center' },
  phone: { width: 96, height: 170, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', transform: [{ rotate: '12deg' }] },
  ring: { position: 'absolute', width: 170, height: 70, borderRadius: 85, borderWidth: 6, borderColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-20deg' }], bottom: 40 },
  tile: { position: 'absolute', width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: 16, borderRadius: 32, padding: 22, borderWidth: 1, shadowColor: '#3B4BC8', shadowOpacity: 0.15, shadowRadius: 24, elevation: 4 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 17, marginTop: 4 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 8 },
});
