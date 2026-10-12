import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { errorMessage } from '@/api/client';
import { shopApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { GradientButton } from '@/components/Buttons';
import { Chips } from '@/components/Chips';
import { Field } from '@/components/Field';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { rules, sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';

const CATEGORIES = ['KIRANA', 'MEDICAL', 'RESTAURANT', 'CLOTHING', 'ELECTRONICS', 'VEGETABLES', 'SERVICES', 'OTHER'] as const;
const GST = [0, 5, 12, 18, 28] as const;
const pretty = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export default function ShopSetup() {
  const { theme } = useTheme();
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('KIRANA');
  const [gst, setGst] = useState<(typeof GST)[number]>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    shopApi.profile().then((p) => {
      setName(p.shopName);
      setGstin(p.gstin ?? '');
      if ((CATEGORIES as readonly string[]).includes(p.category)) setCategory(p.category as (typeof CATEGORIES)[number]);
      if ((GST as readonly number[]).includes(p.defaultGst)) setGst(p.defaultGst as (typeof GST)[number]);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!name.trim()) return setError('Enter your shop name');
    if (gstin && !rules.gstin.test(gstin)) return setError('GSTIN must be 15 characters, e.g. 33ABCDE1234F1Z5');
    setBusy(true);
    setError(undefined);
    try {
      await shopApi.saveProfile({ shopName: name.trim(), gstin: gstin || undefined, category, defaultGst: gst });
      await refreshProfile();
      router.replace('/shop');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Shop Mode" subtitle="Payments + accounting in one app" />
      <GlassCard style={{ gap: 14 }}>
        <Text style={{ color: theme.textMuted }}>
          Every UPI payment you receive is added to your books automatically. Add cash sales and expenses by voice in Tamil, Hindi, Telugu or English. Get daily profit and a monthly GST summary.
        </Text>
        <Field icon="storefront" label="Shop name" value={name} onChangeText={(v) => setName(sanitizeText(v, 80))} />
        <Field icon="receipt" label="GSTIN (optional)" value={gstin} onChangeText={(v) => setGstin(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))} autoCapitalize="characters" />
        <Text style={{ color: theme.text, fontWeight: '700' }}>Shop type</Text>
        <Chips options={CATEGORIES} value={category} onChange={setCategory} format={pretty} />
        <Text style={{ color: theme.text, fontWeight: '700' }}>Usual GST rate on your sales</Text>
        <Chips options={GST} value={gst} onChange={setGst} format={(g) => `${g}%`} />
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        <GradientButton title="Save & open shop" onPress={save} loading={busy} />
      </GlassCard>
    </Screen>
  );
}
