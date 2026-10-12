import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeContext';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  /** Extra bottom padding so content clears the floating tab bar. */
  withTabBar?: boolean;
};

export function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle, withTabBar }: Props) {
  const { theme } = useTheme();
  const padding = { paddingBottom: withTabBar ? 120 : 32 };
  return (
    <View style={[styles.root, styles.clip]}>
      <StatusBar style={theme.statusBar} />
      <LinearGradient colors={theme.background} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={theme.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={styles.hero}
      />
      <View style={[styles.glow, { backgroundColor: 'rgba(120,200,255,0.35)' }]} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.content, padding, contentStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#fff" /> : undefined}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, styles.root, padding, contentStyle]}>{children}</View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clip: { overflow: 'hidden' },
  content: { paddingHorizontal: 16, gap: 14 },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: 330, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  glow: { position: 'absolute', top: 60, right: -80, width: 260, height: 260, borderRadius: 130, opacity: 0.6 },
});
