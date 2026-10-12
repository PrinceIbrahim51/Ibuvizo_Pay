import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { errorMessage } from '@/api/client';
import { userApi } from '@/api/endpoints';
import type { Lang } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { GradientButton } from '@/components/Buttons';
import { Field } from '@/components/Field';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { maskPhone, rules, sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

export default function PersonalInfo() {
  const { theme } = useTheme();
  const { profile, setProfile } = useAuth();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [lang, setLang] = useState<Lang>(profile?.preferredLanguage ?? 'en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (!rules.name.test(name.trim())) return setError('Enter a valid name');
    if (email && !rules.email.test(email)) return setError('Enter a valid email');
    setBusy(true);
    setError(undefined);
    try {
      setProfile(await userApi.update({ fullName: name.trim(), email: email || undefined, preferredLanguage: lang }));
      Alert.alert('Saved', 'Your details were updated.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Personal Info" subtitle="Name, mobile number, UPI ID, email" />
      <GlassCard style={{ gap: 14 }}>
        <Field icon="person" label="Full name" value={name} onChangeText={(v) => setName(sanitizeText(v, 80))} autoCapitalize="words" />
        <Field icon="mail" label="Email (optional)" value={email} onChangeText={(v) => setEmail(v.replace(/\s/g, '').slice(0, 120))} keyboardType="email-address" />
        <Field icon="call" label="Mobile number (cannot be changed)" value={profile ? maskPhone(profile.phone) : ''} editable={false} />
        <Field icon="at" label="UPI ID" value={profile?.vpa ?? ''} editable={false} />
        <Text style={{ color: theme.text, fontWeight: '700' }}>Voice & app language</Text>
        <Segmented<Lang>
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिंदी' },
            { value: 'ta', label: 'தமிழ்' },
            { value: 'te', label: 'తెలుగు' },
          ]}
        />
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Save" icon="checkmark" onPress={save} loading={busy} />
      </GlassCard>
    </Screen>
  );
}
