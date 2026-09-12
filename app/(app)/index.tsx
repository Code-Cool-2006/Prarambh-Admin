import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import client from '@/src/api/client';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { SparkTheme } from '@/constants/theme';
import { CyberCard } from '@/components/CyberCard';

const FINDER_SIZE = 260;
const CORNER_SIZE = 26;

interface ScanResultData {
  ok: boolean;
  message: string;
  attendee?: {
    name?: string;
    usn?: string;
    college?: string;
    attendance_code?: string;
  };
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { admin, logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const scanType = 'IN';

  const [result, setResult] = useState<ScanResultData | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  
  // Manual Entry Modal
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const cooldown = useRef(false);

  // Animated laser line y-position
  const laserY = useSharedValue(0);

  React.useEffect(() => {
    laserY.value = withRepeat(
      withSequence(
        withTiming(FINDER_SIZE - 6, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [laserY]);

  const animatedLaserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserY.value }],
  }));

  const fetchTodayCount = async () => {
    try {
      const res = await client.get('/attendance/report/today');
      const present = res.data.filter((r: any) => r.check_ins > 0).length;
      setTodayCount(present);
    } catch (err) {
      console.log('Error fetching today count:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodayCount();
      setIsScanning(true);
    }, [])
  );

  const processScanData = async (data: string) => {
    try {
      const res = await client.post('/scan', {
        qrData: data.trim(),
        scanType,
        scannedBy: admin?.name || 'Admin',
        location: 'Main Gate',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult({
        ok: true,
        message: res.data.message || `Check-in logged successfully!`,
        attendee: res.data.attendee || undefined,
      });
      fetchTodayCount();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.response?.data?.error || 'Scan failed. Code not recognized.';
      setResult({ ok: false, message: msg });
    }
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (cooldown.current || !isScanning) return;
    cooldown.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await processScanData(data);

    // 3.5-second cooldown to display the verified pass card
    setTimeout(() => {
      cooldown.current = false;
      setResult(null);
    }, 3500);
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) {
      return Alert.alert('Input Required', 'Please enter a USN, Attendance Code, or Email.');
    }

    setManualLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await processScanData(manualInput.trim());
      setManualModalVisible(false);
      setManualInput('');
    } finally {
      setManualLoading(false);
      setTimeout(() => {
        setResult(null);
      }, 3500);
    }
  };

  if (!permission) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={SparkTheme.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, s.center, { padding: 24 }]}>
        <CyberCard style={{ maxWidth: 360 }} innerStyle={{ alignItems: 'center', padding: 26 }}>
          <Ionicons name="camera-outline" size={52} color={SparkTheme.rose} style={{ marginBottom: 16 }} />
          <Text style={s.permTitle}>Camera Access Required</Text>
          <Text style={s.permDesc}>
            To scan attendee QR gate passes for the Illuminate &apos;26 workshop, please enable camera access.
          </Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.88}>
            <LinearGradient
              colors={SparkTheme.gradients.radiant}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.permBtnGradient}
            >
              <Text style={s.permBtnText}>Grant Camera Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
        </CyberCard>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Camera Stream */}
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result ? undefined : handleScan}
        enableTorch={torchOn}
        facing={facing}
      />

      {/* Futuristic Vignette Cutout */}
      <View style={s.overlayContainer}>
        <View style={s.overlayTop} />

        <View style={s.overlayMiddleRow}>
          <View style={s.overlayLeftRight} />

          {/* Viewfinder Target Area */}
          <View style={s.finder}>
            {/* Cyber Corner Accents */}
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />

            {/* Glowing Laser */}
            <Animated.View style={[s.laser, animatedLaserStyle]} />
          </View>

          <View style={s.overlayLeftRight} />
        </View>

        <View style={s.overlayBottom}>
          <View style={s.hintPill}>
            <Ionicons name="scan-outline" size={14} color="#e879f9" style={{ marginRight: 6 }} />
            <Text style={s.hintText}>Point camera at Attendee Pass QR</Text>
          </View>
        </View>
      </View>

      {/* Floating Header */}
      <BlurView
        tint="dark"
        intensity={80}
        style={[
          s.topBar,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
          },
        ]}
      >
        <View style={s.headerLeft}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>
              {admin?.name
                ? admin.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'AD'}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <View style={s.badgePill}>
              <Text style={s.badgePillText}>SPARK GATE ADMIN</Text>
            </View>
            <Text style={s.adminName}>{admin?.name || 'Admin'}</Text>
          </View>
        </View>

        {/* Live Scanned Counter */}
        <View style={s.countBadge}>
          <Text style={s.countNum}>{todayCount}</Text>
          <Text style={s.countLabel}>CHECKED IN</Text>
        </View>
      </BlurView>

      {/* Quick Camera Action Toolbar (Right side floating) */}
      <View style={[s.sideToolbar, { top: Math.max(insets.top, 20) + 72 }]}>
        {/* Torch Toggle */}
        <TouchableOpacity
          style={[s.toolBtn, torchOn && s.toolBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTorchOn(!torchOn);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={torchOn ? 'flash' : 'flash-outline'}
            size={20}
            color={torchOn ? '#ffffff' : '#c4b5fd'}
          />
        </TouchableOpacity>

        {/* Flip Camera */}
        <TouchableOpacity
          style={s.toolBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFacing(f => (f === 'back' ? 'front' : 'back'));
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-reverse-outline" size={20} color="#c4b5fd" />
        </TouchableOpacity>

        {/* Manual Lookup Modal Button */}
        <TouchableOpacity
          style={s.toolBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setManualModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="keypad-outline" size={20} color="#c4b5fd" />
        </TouchableOpacity>
      </View>

      {/* Rich Verification Result Card */}
      {result && (
        <View
          style={[
            s.resultContainer,
            {
              bottom: Math.max(insets.bottom, 16) + 84,
            },
          ]}
        >
          <CyberCard
            offsetColor={result.ok ? '#059669' : '#dc2626'}
            borderColor={result.ok ? '#34d399' : '#f43f5e'}
            innerStyle={s.resultInner}
          >
            <View style={s.resultHeader}>
              <View
                style={[
                  s.resultIconCircle,
                  result.ok ? s.resultIconCircleOk : s.resultIconCircleErr,
                ]}
              >
                <Ionicons
                  name={result.ok ? 'checkmark' : 'alert'}
                  size={24}
                  color="#ffffff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.resultTitle, result.ok ? s.resultTitleOk : s.resultTitleErr]}>
                  {result.ok ? 'PASS VERIFIED' : 'SCAN ERROR'}
                </Text>
                <Text style={s.resultMessage}>{result.message}</Text>
              </View>
            </View>

            {/* If attendee details provided, display meta badges */}
            {result.attendee && (
              <View style={s.attendeeCardDetails}>
                {result.attendee.name ? (
                  <Text style={s.attendeeNameText}>{result.attendee.name}</Text>
                ) : null}
                <View style={s.badgeRow}>
                  {result.attendee.usn ? (
                    <View style={s.usnBadge}>
                      <Text style={s.usnBadgeText}>{result.attendee.usn}</Text>
                    </View>
                  ) : null}
                  {result.attendee.attendance_code ? (
                    <View style={s.codeBadge}>
                      <Text style={s.codeBadgeText}>{result.attendee.attendance_code}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </CyberCard>
        </View>
      )}

      {/* Floating Bottom Navigation Dock (Safe Area Supported) */}
      <BlurView
        tint="dark"
        intensity={85}
        style={[
          s.dockNav,
          {
            bottom: Math.max(insets.bottom, 16) + 10,
          },
        ]}
      >
        <TouchableOpacity
          style={s.dockItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/attendance');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.3)', 'rgba(147, 51, 234, 0.1)']}
            style={s.dockItemGradient}
          >
            <Ionicons name="list-outline" size={18} color="#e879f9" style={{ marginRight: 8 }} />
            <Text style={s.dockItemText}>Attendance Logs</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.dockDivider} />

        <TouchableOpacity
          style={s.dockLogout}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#f87171" style={{ marginRight: 6 }} />
          <Text style={s.dockLogoutText}>Exit</Text>
        </TouchableOpacity>
      </BlurView>

      {/* Manual Check-in Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <CyberCard style={s.modalCard} innerStyle={s.modalInner}>
            <View style={s.modalHeader}>
              <View style={s.modalTitleRow}>
                <Ionicons name="search" size={20} color="#e879f9" style={{ marginRight: 8 }} />
                <Text style={s.modalTitle}>Manual Attendee Verification</Text>
              </View>
              <TouchableOpacity onPress={() => setManualModalVisible(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#c4b5fd" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalDesc}>
              Enter attendee&apos;s USN, Attendance Code, or Email to check them in manually:
            </Text>

            <TextInput
              style={s.modalInput}
              placeholder="e.g. 2GI22CS001 or SPARK-ATT-..."
              placeholderTextColor={SparkTheme.textMuted}
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={s.modalSubmitBtn}
              onPress={handleManualSubmit}
              disabled={manualLoading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={SparkTheme.gradients.radiant}
                style={s.modalSubmitGradient}
              >
                {manualLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={s.modalSubmitText}>Verify & Check In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </CyberCard>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060010',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SparkTheme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 13,
    color: SparkTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  permBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  permBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(6, 0, 16, 0.76)',
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: FINDER_SIZE,
  },
  overlayLeftRight: {
    flex: 1,
    backgroundColor: 'rgba(6, 0, 16, 0.76)',
  },
  finder: {
    width: FINDER_SIZE,
    height: FINDER_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#e879f9',
    borderWidth: 3.5,
    shadowColor: '#e879f9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  tl: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  tr: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  br: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  laser: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3.5,
    backgroundColor: '#e879f9',
    shadowColor: '#e879f9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  overlayBottom: {
    flex: 1.3,
    backgroundColor: 'rgba(6, 0, 16, 0.76)',
    alignItems: 'center',
    paddingTop: 24,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 8, 44, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  hintText: {
    color: SparkTheme.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.25)',
    backgroundColor: 'rgba(6, 0, 16, 0.85)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1b0c36',
    borderWidth: 1.8,
    borderColor: '#c084fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#e879f9',
    fontWeight: '800',
    fontSize: 13,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  badgePillText: {
    color: '#c084fc',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  adminName: {
    color: SparkTheme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(14, 5, 31, 0.85)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(232, 121, 249, 0.4)',
  },
  countNum: {
    color: '#e879f9',
    fontSize: 19,
    fontWeight: '800',
  },
  countLabel: {
    color: SparkTheme.textSecondary,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sideToolbar: {
    position: 'absolute',
    right: 16,
    gap: 12,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 5, 31, 0.85)',
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  toolBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#c084fc',
  },
  resultContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 50,
  },
  resultInner: {
    padding: 18,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  resultIconCircleOk: {
    backgroundColor: '#059669',
  },
  resultIconCircleErr: {
    backgroundColor: '#dc2626',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  resultTitleOk: {
    color: '#34d399',
  },
  resultTitleErr: {
    color: '#f43f5e',
  },
  resultMessage: {
    color: SparkTheme.text,
    fontSize: 13.5,
    fontWeight: '600',
  },
  attendeeCardDetails: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.25)',
  },
  attendeeNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ede9fe',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usnBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  usnBadgeText: {
    color: '#e879f9',
    fontSize: 11,
    fontWeight: '700',
  },
  codeBadge: {
    backgroundColor: 'rgba(14, 5, 31, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: SparkTheme.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  dockNav: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    backgroundColor: 'rgba(14, 5, 31, 0.88)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  dockItem: {
    flex: 1.3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dockItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dockItemText: {
    color: SparkTheme.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  dockDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    marginHorizontal: 4,
  },
  dockLogout: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dockLogoutText: {
    color: '#f87171',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxWidth: 420,
  },
  modalInner: {
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SparkTheme.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: SparkTheme.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: SparkTheme.inputBg,
    borderWidth: 1.4,
    borderColor: SparkTheme.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    color: SparkTheme.text,
    fontSize: 15,
    marginBottom: 18,
  },
  modalSubmitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalSubmitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
