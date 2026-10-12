import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { shopApi, voiceApi } from '@/api/endpoints';
import type { Lang, VoiceParse } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { GradientButton } from '@/components/Buttons';
import { GlassCard } from '@/components/Glass';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { LANG_LABEL, SPEECH_LOCALE, VOICE_EXAMPLES, t } from '@/lib/i18n';
import { rupee } from '@/lib/money';
import { sanitizeText } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeContext';
import { Alert } from '@/lib/alert';

/**
 * USP: "Voice UPI" + voice bookkeeping in Tamil, Hindi, Telugu and English.
 * Speech is turned into text by the phone's own recogniser; only that text is sent to IBUVIO for parsing.
 * Nothing is executed automatically: payments still go through the Send screen and need the UPI PIN.
 */
export default function Voice() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [lang, setLang] = useState<Lang>(profile?.preferredLanguage ?? 'en');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typed, setTyped] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<VoiceParse | null>(null);
  const [saving, setSaving] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!listening) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    setTranscript(text);
    if (e.isFinal && text) parse(text);
  });
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      Alert.alert('Voice', e.error === 'language-not-supported'
        ? `${LANG_LABEL[lang]} speech recognition is not installed on this phone. Add it in your keyboard/voice settings, or type instead.`
        : 'Could not hear you clearly. Please try again or type your command.');
    }
  });

  const startListening = async () => {
    setResult(null);
    setTranscript('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return Alert.alert('Microphone', 'Allow microphone and speech recognition to use voice commands.');
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      return Alert.alert('Voice', 'Speech recognition is not available on this phone. You can type your command instead.');
    }
    ExpoSpeechRecognitionModule.start({ lang: SPEECH_LOCALE[lang], interimResults: true, continuous: false, maxAlternatives: 1 });
    setListening(true);
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
    setListening(false);
  };

  const parse = async (text: string) => {
    const clean = sanitizeText(text, 200).trim();
    if (!clean) return;
    setParsing(true);
    try {
      setResult(await voiceApi.parse(clean, lang));
    } catch (e) {
      Alert.alert('Voice', errorMessage(e));
    } finally {
      setParsing(false);
    }
  };

  const confirm = async () => {
    if (!result) return;
    if (result.intent === 'PAY') {
      if (!result.payeeVpa) {
        Alert.alert('Payee not found', `Could not find "${result.payeeName ?? ''}" in your recent payees. Enter their UPI ID.`);
        return router.replace('/pay-upi-id');
      }
      return router.replace({
        pathname: '/send',
        params: { vpa: result.payeeVpa, name: result.payeeName ?? '', amount: result.amountPaise ? String(result.amountPaise) : '', channel: 'VOICE' },
      });
    }
    if (result.intent === 'RECORD_SALE' || result.intent === 'RECORD_EXPENSE') {
      if (!profile?.businessMode) return router.replace('/shop/setup');
      if (!result.amountPaise) return Alert.alert('Amount missing', 'Please say the amount again.');
      setSaving(true);
      try {
        const sale = result.intent === 'RECORD_SALE';
        const shop = sale ? await shopApi.profile().catch(() => null) : null;
        await shopApi.addEntry({
          type: sale ? 'INCOME' : 'EXPENSE',
          amountPaise: result.amountPaise,
          gstRate: sale ? shop?.defaultGst ?? 0 : 0,
          category: result.category ?? (sale ? 'SALES' : 'OTHER'),
          paymentMode: result.paymentMode ?? 'CASH',
          note: sanitizeText(transcript || typed, 100).trim() || undefined,
          fromVoice: true,
        });
        Alert.alert('✓', t('saved', lang));
        router.replace('/shop');
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      } finally {
        setSaving(false);
      }
    }
  };

  const intentLabel = result && {
    PAY: { icon: 'paper-plane' as const, label: 'Payment' },
    RECORD_SALE: { icon: 'trending-up' as const, label: 'Shop sale' },
    RECORD_EXPENSE: { icon: 'trending-down' as const, label: 'Shop expense' },
    UNKNOWN: { icon: 'help-circle' as const, label: 'Not understood' },
  }[result.intent];

  return (
    <Screen>
      <Header title="Voice Pay" subtitle="Pay and keep accounts by speaking" />
      <Segmented<Lang>
        value={lang}
        onChange={(l) => { setLang(l); setResult(null); }}
        options={(['ta', 'hi', 'te', 'en'] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l] }))}
      />

      <GlassCard style={{ alignItems: 'center', gap: 16, paddingVertical: 28 }}>
        <Pressable onPress={listening ? stopListening : startListening} accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Start voice command'}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <LinearGradient colors={listening ? ['#FB7185', '#E11D48'] : ['#8B5CF6', '#3B82F6']} style={styles.mic}>
              <Ionicons name={listening ? 'stop' : 'mic'} size={56} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{listening ? t('listening', lang) : t('speakNow', lang)}</Text>
        {transcript ? <Text style={{ color: theme.text, fontSize: 20, textAlign: 'center' }}>“{transcript}”</Text> : null}
        <View style={styles.examples}>
          {VOICE_EXAMPLES[lang].map((ex) => (
            <Pressable key={ex} onPress={() => { setTranscript(ex); parse(ex); }} style={[styles.example, { backgroundColor: theme.input }]}>
              <Text style={{ color: theme.textMuted }}>“{ex}”</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <Text style={{ color: theme.textMuted }}>{t('typeInstead', lang)}</Text>
        <View style={[styles.typeRow, { backgroundColor: theme.input }]}>
          <TextInput
            value={typed}
            onChangeText={(v) => setTyped(sanitizeText(v, 200))}
            placeholder={VOICE_EXAMPLES[lang][0]}
            placeholderTextColor={theme.textMuted}
            style={{ flex: 1, color: theme.text, fontSize: 17 }}
            onSubmitEditing={() => parse(typed)}
            returnKeyType="go"
          />
          <Pressable onPress={() => parse(typed)} accessibilityLabel="Submit"><Ionicons name="arrow-forward-circle" size={36} color={theme.primary} /></Pressable>
        </View>
      </GlassCard>

      {parsing ? <ActivityIndicator color={theme.primary} /> : null}
      {result && intentLabel ? (
        <GlassCard style={{ gap: 12 }}>
          <View style={styles.typeRow}>
            <Ionicons name={intentLabel.icon} size={26} color={theme.primary} />
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{intentLabel.label}</Text>
          </View>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700' }}>{result.confirmation}</Text>
          {result.amountPaise ? <Text style={{ color: theme.textMuted }}>Amount: {rupee(result.amountPaise)}</Text> : null}
          {result.intent === 'PAY' ? (
            <Text style={{ color: result.payeeMatched ? theme.success : theme.warning }}>
              {result.payeeMatched ? `Payee: ${result.payeeName} (${result.payeeVpa})` : `Payee "${result.payeeName ?? '?'}" not in recent payees`}
            </Text>
          ) : null}
          {result.intent !== 'UNKNOWN' ? (
            <GradientButton title={t('confirm', lang)} icon="checkmark" onPress={confirm} loading={saving} />
          ) : null}
          <Pressable onPress={() => setResult(null)} style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.textMuted, fontWeight: '600' }}>{t('cancel', lang)}</Text>
          </Pressable>
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mic: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', shadowColor: '#6D28D9', shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  example: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
});
