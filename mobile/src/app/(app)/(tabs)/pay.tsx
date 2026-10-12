import { Ionicons } from '@expo/vector-icons';
import { CameraView, scanFromURLAsync, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconBadge } from '@/components/Buttons';
import { GlassCard, SectionHeader } from '@/components/Glass';
import { CircleButton } from '@/components/Header';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { parseUpiQr } from '@/lib/upiQr';
import { useTheme } from '@/theme/ThemeContext';

export default function ScanAndPay() {
  const { theme } = useTheme();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) handled.current = false;
  }, [focused]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [line]);

  const openPayment = (raw: string) => {
    if (handled.current) return;
    const qr = parseUpiQr(raw);
    if (!qr) {
      handled.current = true;
      Alert.alert('Not a valid UPI QR', 'This QR code is not a UPI payment code or looks tampered with.', [
        { text: 'OK', onPress: () => (handled.current = false) },
      ]);
      return;
    }
    handled.current = true;
    setTorch(false);
    router.push({
      pathname: '/send',
      params: {
        vpa: qr.vpa,
        name: qr.name ?? '',
        amount: qr.amountPaise ? String(qr.amountPaise) : '',
        note: qr.note ?? '',
        channel: 'QR',
      },
    });
  };

  const onScan = (r: BarcodeScanningResult) => openPayment(r.data);

  const fromGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    try {
      const results = await scanFromURLAsync(picked.assets[0].uri, ['qr']);
      if (!results[0]) return Alert.alert('No QR found', 'Choose a clear photo of a UPI QR code.');
      openPayment(results[0].data);
    } catch {
      Alert.alert('No QR found', 'Choose a clear photo of a UPI QR code.');
    }
  };

  const translateY = line.interpolate({ inputRange: [0, 1], outputRange: [0, 236] });

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <CircleButton icon="chevron-back" label="Back" onPress={() => router.navigate('/home')} />
        <View style={{ alignItems: 'center' }}>
          <Logo size={30} />
          <Text style={styles.title}>Scan & Pay</Text>
          <Text style={styles.subtitle}>Pay to any UPI QR instantly</Text>
        </View>
        <CircleButton
          icon="help-circle-outline"
          label="Help"
          onPress={() => Alert.alert('Scan & Pay', 'Point your camera at any UPI QR code. Always check the payee name before entering your UPI PIN.')}
        />
      </View>

      <View style={styles.cameraCard}>
        {permission?.granted && focused ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScan}
          />
        ) : (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={styles.permissionText}>Allow camera access to scan UPI QR codes</Text>
            <Pressable onPress={requestPermission} style={styles.permissionBtn}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Allow camera</Text>
            </Pressable>
          </View>
        )}
        {permission?.granted ? <View style={styles.frame} pointerEvents="none">
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
        </View> : null}
        <View style={styles.cameraFooter} pointerEvents="box-none">
          <Text style={styles.scanTitle}>Scan any UPI QR</Text>
          <Text style={styles.scanSub}>Pay to merchants, friends or any UPI app</Text>
          <View style={styles.camButtons}>
            <Pressable onPress={() => setTorch((t) => !t)} style={styles.camBtnWrap} accessibilityLabel="Flashlight">
              <View style={[styles.camBtn, torch && { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
                <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={30} color="#fff" />
              </View>
              <Text style={styles.camLabel}>Flashlight</Text>
            </Pressable>
            <Pressable onPress={fromGallery} style={styles.camBtnWrap} accessibilityLabel="Scan from gallery">
              <View style={styles.camBtn}><Ionicons name="image-outline" size={30} color="#fff" /></View>
              <Text style={styles.camLabel}>Gallery</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <GlassCard>
        <SectionHeader title="Other ways to pay" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <WayToPay icon="person" g="blue" title="Pay Contact" sub="From recent payees" onPress={() => router.push('/pay-upi-id')} />
          <WayToPay icon="document-text" g="orange" title="Requests" sub="Pay money requests" onPress={() => router.push('/request')} />
          <WayToPay icon="at" g="purple" title="Pay with UPI ID" sub="Enter UPI ID manually" onPress={() => router.push('/pay-upi-id')} />
        </View>
      </GlassCard>
    </Screen>
  );
}

function WayToPay({ icon, g, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; g: 'blue' | 'orange' | 'purple'; title: string; sub: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.way, { backgroundColor: theme.input, borderColor: theme.cardBorder }]} accessibilityRole="button">
      <IconBadge icon={icon} gradient={g} size={60} />
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center' }}>{sub}</Text>
    </Pressable>
  );
}

const C = 46;
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  cameraCard: { height: 560, borderRadius: 32, overflow: 'hidden', backgroundColor: '#1E2560', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  permission: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 230, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: 16 },
  permissionBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  frame: { position: 'absolute', top: 70, alignSelf: 'center', width: 250, height: 250 },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 22 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 22 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 22 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 22 },
  scanLine: { position: 'absolute', left: 4, right: 4, top: 6, height: 3, borderRadius: 2, backgroundColor: '#60A5FA', shadowColor: '#3B82F6', shadowOpacity: 1, shadowRadius: 10, elevation: 8 },
  cameraFooter: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  scanTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  scanSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4 },
  camButtons: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 50, marginTop: 24 },
  camBtnWrap: { alignItems: 'center', gap: 8 },
  camBtn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  camLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  way: { flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 22, borderWidth: 1 },
});
