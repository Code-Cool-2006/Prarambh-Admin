import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/src/context/AuthContext';
import client from '@/src/api/client';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const FINDER_SIZE = 260;
const CORNER_SIZE = 24;

export default function ScannerScreen() {
  const { admin, logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const scanType = 'IN';
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const cooldown = useRef(false);

  // Animated laser line y-position
  const laserY = useSharedValue(0);

  // Run laser animation on mount
  React.useEffect(() => {
    laserY.value = withRepeat(
      withSequence(
        withTiming(FINDER_SIZE - 4, { duration: 2200 }),
        withTiming(0, { duration: 2200 })
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
      // Count unique people who checked in today
      const present = res.data.filter((r: any) => r.check_ins > 0).length;
      setTodayCount(present);
    } catch (err) {
      console.log('Error fetching today count:', err);
    }
  };

  // Re-fetch count when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchTodayCount();
      setIsScanning(true);
    }, [])
  );

  const handleScan = async ({ data }: { data: string }) => {
    if (cooldown.current || !isScanning) return;
    cooldown.current = true;
    
    // Play quick haptic tap on detection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await client.post('/scan', {
        qrData: data,
        scanType,
        scannedBy: admin?.name || 'Admin',
        location: 'Main Entrance',
      });

      // Play success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult({ ok: true, message: res.data.message || `Logged ${scanType} successfully!` });
      
      // Refresh count
      fetchTodayCount();
    } catch (err: any) {
      // Play error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.response?.data?.error || 'Scan failed. Please try again.';
      setResult({ ok: false, message: msg });
    } finally {
      // Cooldown for 3 seconds to show banner and prevent multiple scans of same code
      setTimeout(() => {
        cooldown.current = false;
        setResult(null);
      }, 3000);
    }
  };

  if (!permission) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, s.center, { padding: 24 }]}>
        <View style={s.errorCard}>
          <Ionicons name="camera-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={s.errorTitle}>Camera Permission Required</Text>
          <Text style={s.errorText}>
            This application is for admins to scan user QR codes. Please grant camera access to proceed.
          </Text>
          <TouchableOpacity style={s.permissionBtn} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={s.permissionBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Full-screen Camera View */}
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result ? undefined : handleScan}
      />

      {/* Viewfinder Cutout Overlay */}
      <View style={s.overlayContainer}>
        {/* Top semi-transparent mask */}
        <View style={s.overlayTop} />
        
        <View style={s.overlayMiddleRow}>
          {/* Left semi-transparent mask */}
          <View style={s.overlayLeftRight} />
          
          {/* Viewfinder Area */}
          <View style={s.finder}>
            {/* Corner accents */}
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
            
            {/* Animated Laser Line */}
            <Animated.View style={[s.laser, animatedLaserStyle]} />
          </View>
          
          {/* Right semi-transparent mask */}
          <View style={s.overlayLeftRight} />
        </View>
        
        {/* Bottom semi-transparent mask containing hints */}
        <View style={s.overlayBottom}>
          <Text style={s.hintText}>Align attendee&apos;s QR code within the frame</Text>
        </View>
      </View>

      {/* Floating Glassmorphic Top Bar */}
      <BlurView tint="dark" intensity={70} style={s.topBar}>
        <View style={s.adminProfile}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {admin?.name ? admin.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={s.adminLabel}>Logged in as</Text>
            <Text style={s.adminName}>{admin?.name || 'Admin'}</Text>
          </View>
        </View>

        <View style={s.countBadge}>
          <Text style={s.countNum}>{todayCount}</Text>
          <Text style={s.countLabel}>Scanned In</Text>
        </View>
      </BlurView>

      {/* Result feedback banner */}
      {result && (
        <View style={[s.banner, result.ok ? s.bannerOk : s.bannerErr]}>
          <View style={[s.bannerIconBg, result.ok ? s.bannerIconBgOk : s.bannerIconBgErr]}>
            <Ionicons name={result.ok ? 'checkmark' : 'close'} size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>{result.ok ? 'SUCCESS' : 'SCAN FAILED'}</Text>
            <Text style={s.bannerMessage}>{result.message}</Text>
          </View>
        </View>
      )}

      {/* Floating Glassmorphic Bottom Navigation Bar */}
      <BlurView tint="dark" intensity={75} style={s.navBar}>
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/attendance');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={20} color="#10B981" style={{ marginRight: 8 }} />
          <Text style={s.navBtnText}>View Report</Text>
        </TouchableOpacity>

        <View style={s.divider} />

        <TouchableOpacity 
          style={s.logoutBtn} 
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
          }} 
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={s.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  adminProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  avatarText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
  },
  adminLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  adminName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  countNum: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '800',
  },
  countLabel: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: FINDER_SIZE,
  },
  overlayLeftRight: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
    borderColor: '#10B981',
    borderWidth: 3.5,
  },
  tl: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
  },
  tr: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 10,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
  },
  br: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 10,
  },
  laser: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  overlayBottom: {
    flex: 1.2,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    paddingTop: 20,
  },
  hintText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  toggleBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActiveIn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toggleActiveOut: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toggleText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  banner: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
  },
  bannerOk: {
    backgroundColor: '#064E3B', // Deep dark emerald green
    borderColor: '#10B981',
  },
  bannerErr: {
    backgroundColor: '#7F1D1D', // Deep dark crimson red
    borderColor: '#EF4444',
  },
  bannerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerIconBgOk: {
    backgroundColor: '#10B981',
  },
  bannerIconBgErr: {
    backgroundColor: '#EF4444',
  },
  bannerTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  bannerMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    fontSize: 14,
  },
  navBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 24,
    left: 24,
    right: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  navBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: 1.5,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoutBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
});
