import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SparkTheme } from '@/constants/theme';
import { checkBackendHealth, API_BASE_URL, HealthStatus } from '@/src/api/client';

interface BackendConnectionBadgeProps {
  variant?: 'banner' | 'compact';
  autoPoll?: boolean;
  pollIntervalMs?: number;
}

export function BackendConnectionBadge({
  variant = 'banner',
  autoPoll = true,
  pollIntervalMs = 20000,
}: BackendConnectionBadgeProps) {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'waking',
    checkedAt: new Date(),
  });
  const [checking, setChecking] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const isMounted = useRef(true);

  // Animated pulse dot
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [pulseOpacity]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const runCheck = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await checkBackendHealth(8000);
      if (isMounted.current) {
        setHealth(result);
      }
    } catch {
      if (isMounted.current) {
        setHealth({
          status: 'offline',
          message: 'Connection timed out',
          checkedAt: new Date(),
        });
      }
    } finally {
      if (isMounted.current) {
        setChecking(false);
      }
    }
  }, [checking]);

  useEffect(() => {
    isMounted.current = true;
    runCheck();

    let timer: NodeJS.Timeout | null = null;
    if (autoPoll) {
      timer = setInterval(runCheck, pollIntervalMs);
    }

    return () => {
      isMounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [autoPoll, pollIntervalMs, runCheck]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  };

  const handleManualPing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await runCheck();
    Haptics.notificationAsync(
      health.status === 'connected'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
  };

  // Visual appearance based on state
  const isConnected = health.status === 'connected';
  const isWaking = health.status === 'waking' || (checking && !isConnected);

  const dotColor = isConnected ? '#34d399' : isWaking ? '#fbbf24' : '#f43f5e';
  const borderColor = isConnected
    ? 'rgba(52, 211, 153, 0.4)'
    : isWaking
    ? 'rgba(251, 191, 36, 0.45)'
    : 'rgba(244, 63, 94, 0.45)';
  const bgColor = isConnected
    ? 'rgba(16, 185, 129, 0.12)'
    : isWaking
    ? 'rgba(245, 158, 11, 0.14)'
    : 'rgba(244, 63, 94, 0.14)';

  const labelText = isConnected
    ? variant === 'compact'
      ? `${health.latencyMs ?? 20}ms`
      : `Live API • ${health.latencyMs ?? 20}ms`
    : isWaking
    ? variant === 'compact'
      ? 'Waking...'
      : 'Waking Server...'
    : variant === 'compact'
    ? 'Offline'
    : 'Backend Offline';

  if (variant === 'compact') {
    return (
      <>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={[s.compactBadge, { backgroundColor: bgColor, borderColor }]}
        >
          {checking ? (
            <ActivityIndicator size="small" color={dotColor} style={s.tinySpinner} />
          ) : (
            <Animated.View
              style={[
                s.statusDot,
                { backgroundColor: dotColor },
                !isConnected && animatedPulseStyle,
              ]}
            />
          )}
          <Text style={[s.compactText, { color: dotColor }]}>{labelText}</Text>
        </TouchableOpacity>

        {renderStatusModal()}
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[s.bannerBadge, { backgroundColor: bgColor, borderColor }]}
      >
        <View style={s.bannerLeft}>
          {checking ? (
            <ActivityIndicator size="small" color={dotColor} style={s.spinner} />
          ) : (
            <Animated.View
              style={[
                s.statusDotLarge,
                { backgroundColor: dotColor },
                !isConnected && animatedPulseStyle,
              ]}
            />
          )}
          <Text style={[s.bannerText, { color: dotColor }]}>{labelText}</Text>
        </View>

        <View style={s.bannerRight}>
          <Text style={s.tapHint}>Details</Text>
          <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.4)" />
        </View>
      </TouchableOpacity>

      {renderStatusModal()}
    </>
  );

  function renderStatusModal() {
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <View style={s.modalHeaderTitleRow}>
                <View style={[s.statusDotLarge, { backgroundColor: dotColor }]} />
                <Text style={s.modalTitle}>Backend Connectivity</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.modalCloseBtn}
                hitSlop={12}
              >
                <Ionicons name="close" size={20} color={SparkTheme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>CURRENT API HOST</Text>
              <Text style={s.infoValue} numberOfLines={2}>
                {API_BASE_URL}
              </Text>
            </View>

            <View style={s.rowTwoCol}>
              <View style={[s.infoBlock, { flex: 1, marginRight: 8 }]}>
                <Text style={s.infoLabel}>STATUS</Text>
                <Text style={[s.infoValueHighlight, { color: dotColor }]}>
                  {isConnected
                    ? 'Connected'
                    : isWaking
                    ? 'Connecting / Waking'
                    : 'Unreachable'}
                </Text>
              </View>
              <View style={[s.infoBlock, { flex: 1, marginLeft: 8 }]}>
                <Text style={s.infoLabel}>RESPONSE TIME</Text>
                <Text style={s.infoValue}>
                  {health.latencyMs ? `${health.latencyMs} ms` : '--'}
                </Text>
              </View>
            </View>

            {health.message && (
              <View style={s.messageBox}>
                <Ionicons
                  name={isConnected ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={dotColor}
                  style={{ marginRight: 6 }}
                />
                <Text style={s.messageText}>{health.message}</Text>
              </View>
            )}

            {isWaking && (
              <View style={s.renderTipBox}>
                <Ionicons name="time-outline" size={15} color="#fbbf24" style={{ marginRight: 6 }} />
                <Text style={s.renderTipText}>
                  On Render&apos;s free tier, servers sleep after 15m of inactivity and can take ~30–50s to spin back up. Please wait a moment.
                </Text>
              </View>
            )}

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.pingBtn, checking && { opacity: 0.6 }]}
                onPress={handleManualPing}
                disabled={checking}
                activeOpacity={0.8}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={s.pingBtnText}>
                  {checking ? 'Checking...' : 'Ping Server Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
}

const s = StyleSheet.create({
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 6,
    alignSelf: 'center',
    maxWidth: '92%',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tapHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginRight: 2,
    fontWeight: '500',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginLeft: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotLarge: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
    transform: [{ scale: 0.75 }],
  },
  tinySpinner: {
    marginRight: 4,
    transform: [{ scale: 0.65 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 0, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0e051f',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    padding: 20,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
    paddingBottom: 12,
  },
  modalHeaderTitleRow: {
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
  infoBlock: {
    backgroundColor: 'rgba(19, 8, 42, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  rowTwoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: SparkTheme.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: SparkTheme.text,
    fontFamily: 'monospace',
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 12,
    color: SparkTheme.textSecondary,
    flex: 1,
  },
  renderTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  renderTipText: {
    fontSize: 11,
    color: '#fef08a',
    flex: 1,
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 6,
  },
  pingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SparkTheme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: SparkTheme.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  pingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
