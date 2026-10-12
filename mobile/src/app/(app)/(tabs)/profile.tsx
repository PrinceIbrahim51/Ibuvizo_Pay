import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { userApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { GlassCard, HeroCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { maskPhone } from '@/lib/validation';
import type { ThemeName } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export default function Profile() {
  const { theme, setTheme } = useTheme();
  const { profile, setProfile, logout } = useAuth();

  const toggleNotifications = async (on: boolean) => {
    if (!profile) return;
    setProfile({ ...profile, notificationsOn: on });
    try {
      setProfile(await userApi.update({ notificationsOn: on }));
    } catch {
      setProfile({ ...profile, notificationsOn: !on });
    }
  };

  const confirmLogout = () =>
    Alert.alert('Logout', 'Sign out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);

  const themes: { name: ThemeName; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { name: 'light', icon: 'sunny-outline', label: 'Light theme' },
    { name: 'dark', icon: 'moon-outline', label: 'Dark theme' },
    { name: 'aurora', icon: 'sparkles', label: 'Aurora theme' },
  ];

  return (
    <Screen withTabBar>
      <Header title="Profile & Settings" subtitle="Manage your account and preferences" back={false} />
      <HeroCard>
        <View style={styles.profile}>
          <Avatar name={profile?.fullName ?? '?'} size={92} online />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.name} numberOfLines={1}>{profile?.fullName}</Text>
            <Pressable style={styles.copyRow} onPress={() => profile && Clipboard.setStringAsync(profile.vpa)} accessibilityLabel="Copy UPI ID">
              <Text style={styles.detail} numberOfLines={1}>{profile?.vpa}</Text>
              <Ionicons name="copy-outline" size={18} color="#fff" />
            </Pressable>
            <Text style={styles.detail}>{profile ? maskPhone(profile.phone) : ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/personal-info')} style={styles.edit} accessibilityRole="button">
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>Edit</Text>
          </Pressable>
        </View>
      </HeroCard>

      <GlassCard style={{ paddingVertical: 4 }}>
        <ListRow icon="person-outline" gradient="blue" title="Personal Info" subtitle="Name, mobile number, UPI ID, email" onPress={() => router.push('/personal-info')} />
        <ListRow icon="lock-closed" gradient="purple" title="Security" subtitle="UPI PIN, biometric login, linked accounts" onPress={() => router.push('/security')} />
        <ListRow
          icon="notifications"
          gradient="green"
          title="Notifications"
          subtitle="Payment alerts, offers, updates"
          right={<Switch value={!!profile?.notificationsOn} onValueChange={toggleNotifications} trackColor={{ true: theme.primary }} />}
        />
        <ListRow
          icon="color-palette"
          gradient="orange"
          title="App Theme"
          subtitle="Choose your theme"
          last
          right={
            <View style={[styles.themes, { backgroundColor: theme.input }]}>
              {themes.map((t) => (
                <Pressable
                  key={t.name}
                  onPress={() => setTheme(t.name)}
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: theme.name === t.name }}
                  style={[styles.themeBtn, theme.name === t.name && { backgroundColor: theme.primary }]}
                >
                  <Ionicons name={t.icon} size={20} color={theme.name === t.name ? '#fff' : theme.text} />
                </Pressable>
              ))}
            </View>
          }
        />
      </GlassCard>

      <GlassCard style={{ paddingVertical: 4 }}>
        <ListRow icon="business" gradient="indigo" title="Bank Accounts & UPI" subtitle="Linked accounts, UPI PIN, KYC" onPress={() => router.push('/accounts')} />
        <ListRow icon="storefront" gradient="teal" title="Shop Mode" subtitle={profile?.businessMode ? 'Books, P&L and GST reports' : 'Turn on auto accounting for your shop'} onPress={() => router.push(profile?.businessMode ? '/shop' : '/shop/setup')} />
        <ListRow icon="leaf" gradient="green" title="Smart Savings" subtitle="Round-up spare change into goals" onPress={() => router.push('/savings')} />
        <ListRow icon="headset" gradient="purple" title="Help & Support" subtitle="Get help, contact us, FAQs" onPress={() => router.push({ pathname: '/info', params: { page: 'help' } })} last />
      </GlassCard>

      <GlassCard style={{ paddingVertical: 4 }}>
        <ListRow icon="shield-half" gradient="blue" title="Privacy Policy" subtitle="How we protect your data" onPress={() => router.push({ pathname: '/info', params: { page: 'privacy' } })} />
        <ListRow icon="document-text" gradient="teal" title="Terms & Conditions" subtitle="Read our terms of service" onPress={() => router.push({ pathname: '/info', params: { page: 'terms' } })} last />
      </GlassCard>

      <GlassCard style={{ paddingVertical: 4, backgroundColor: theme.dangerBg }}>
        <ListRow icon="log-out-outline" gradient="pink" title="Logout" subtitle="Sign out from this device" onPress={confirmLogout} danger last />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { color: '#fff', fontSize: 24, fontWeight: '800' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detail: { color: '#fff', fontSize: 15, flexShrink: 1 },
  edit: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)' },
  themes: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 2 },
  themeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
