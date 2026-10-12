import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeContext';

/** Static content pages. Replace with your lawyer-reviewed Privacy Policy and Terms before launch. */
const PAGES: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect only what is needed to run UPI payments: your name, mobile number, linked bank account details and transaction history.',
      'Bank account numbers are encrypted at rest (AES-256-GCM). PINs are never stored in readable form.',
      'We never sell your data. We do not read your SMS, contacts or location.',
      'Voice commands are converted to text by your phone\'s built-in speech service (Google on Android, Apple on iOS). IBUVIO never receives or stores your audio, only the recognised text.',
      'You can request deletion of your account by contacting support.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: [
      'IBUVIO provides UPI payment services through its partner bank, subject to NPCI guidelines.',
      'You are responsible for keeping your MPIN and UPI PIN secret. IBUVIO staff will never ask for them.',
      'Transaction limits: up to ₹1,00,000 per transaction and per day; ₹5,000 in the first 24 hours after sign-up.',
      'Shop Mode reports are an aid to bookkeeping and are not a substitute for professional tax advice.',
    ],
  },
  help: {
    title: 'Help & Support',
    body: [
      'Payment failed but money debited? It is auto-reversed by your bank within 48 hours as per NPCI rules.',
      'UPI PIN blocked? It unblocks after 24 hours, or reset it from Bank Accounts → UPI PIN.',
      'Lost your phone? Sign in on a new phone and choose Security → Sign out of all devices.',
      'Report fraud immediately: call 1930 (National Cyber Crime Helpline) and your bank.',
    ],
  },
  kyc: {
    title: 'KYC',
    body: [
      'KYC is verified by our compliance team against your bank-registered details.',
      'Once verified, your status shows "Verified" in Bank Accounts & UPI.',
    ],
  },
};

export default function Info() {
  const { theme } = useTheme();
  const { page } = useLocalSearchParams<{ page: string }>();
  const content = PAGES[page] ?? PAGES.help;
  return (
    <Screen>
      <Header title={content.title} />
      <GlassCard style={{ gap: 12 }}>
        {content.body.map((p) => (
          <Text key={p} style={{ color: theme.text, fontSize: 16, lineHeight: 23 }}>{p}</Text>
        ))}
      </GlassCard>
    </Screen>
  );
}
