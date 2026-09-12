import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SparkTheme } from '@/constants/theme';
import { CyberCard } from '@/components/CyberCard';
import { CosmicBackground } from '@/components/CosmicBackground';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFocus, setUserFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert('Required Fields', 'Please enter both your admin username and password.');
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await login(username.trim(), password.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let title = 'Authentication Failed';
      let msg = 'Invalid username or password. Please try again.';

      if (err.message === 'Not an admin account' || err.response?.status === 403) {
        msg = 'This account does not have administrator privileges.';
      } else if (!err.response) {
        title = 'Connection Error';
        msg = `Cannot connect to server at ${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.20:3000'}. Please ensure your backend is running.`;
      } else if (err.response?.status === 500) {
        title = 'Server Error';
        msg = 'Backend encountered an internal server error. Please check database connectivity.';
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }

      Alert.alert(title, msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.screen}>
      <CosmicBackground />

      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingTop: Math.max(insets.top, 24) + 16,
              paddingBottom: Math.max(insets.bottom, 24) + 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Institutional Partner Branding */}
          <View style={s.partnerRow}>
            <View style={s.partnerLogos}>
              <Image
                source={require('@/assets/images/kls-logo.png')}
                style={s.partnerLogo}
                resizeMode="contain"
              />
              <Image
                source={require('@/assets/images/git-logo.png')}
                style={s.partnerLogo}
                resizeMode="contain"
              />
            </View>

            {/* Subtle Gradient Vertical Divider */}
            <LinearGradient
              colors={['transparent', 'rgba(167, 139, 250, 0.5)', 'transparent']}
              style={s.partnerDivider}
            />

            <Image
              source={require('@/assets/images/spark-logo.png')}
              style={s.sparkLogoNav}
              resizeMode="contain"
            />
          </View>

          {/* Eyebrow Pill Badge */}
          <View style={s.eyebrowBadge}>
            <Ionicons name="sparkles" size={12} color="#e879f9" style={{ marginRight: 6 }} />
            <Text style={s.eyebrowText}>E-CELL, IIT BOMBAY × SPARK</Text>
          </View>

          {/* Main Title */}
          <View style={s.titleContainer}>
            <Text style={s.title}>Illuminate &apos;26</Text>
            <Text style={s.subTitle}>Admin Gate Pass & Attendance Portal</Text>
          </View>

          {/* CyberCard Form */}
          <CyberCard style={s.cardWrapper} innerStyle={s.cardInner}>
            <Text style={s.cardHeading}>ADMIN LOGIN</Text>
            <Text style={s.cardSub}>Scan pass QR codes and manage event logs</Text>

            {/* Username Input */}
            <Text style={s.inputLabel}>Admin Username</Text>
            <Pressable
              style={[s.inputWrapper, userFocus && s.inputWrapperFocus]}
              onPress={() => usernameInputRef.current?.focus()}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={userFocus ? '#e879f9' : '#a78bfa'}
                style={s.inputIcon}
              />
              <TextInput
                ref={usernameInputRef}
                style={s.input}
                placeholder="e.g. admin"
                placeholderTextColor={SparkTheme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setUserFocus(true)}
                onBlur={() => setUserFocus(false)}
                editable={!loading}
              />
            </Pressable>

            {/* Password Input */}
            <Text style={s.inputLabel}>Password</Text>
            <Pressable
              style={[s.inputWrapper, passFocus && s.inputWrapperFocus]}
              onPress={() => passwordInputRef.current?.focus()}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passFocus ? '#e879f9' : '#a78bfa'}
                style={s.inputIcon}
              />
              <TextInput
                ref={passwordInputRef}
                style={s.input}
                placeholder="Enter password"
                placeholderTextColor={SparkTheme.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={s.eyeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color="#a78bfa"
                />
              </TouchableOpacity>
            </Pressable>

            {/* Submit Button */}
            <TouchableOpacity
              style={s.submitBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={SparkTheme.gradients.radiant}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btnGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={s.btnContent}>
                    <Text style={s.btnText}>Sign In to Gate Portal</Text>
                    <Ionicons name="arrow-forward" size={17} color="#ffffff" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </CyberCard>

          {/* Security Footnote */}
          <View style={s.securityBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#a78bfa" style={{ marginRight: 6 }} />
            <Text style={s.securityText}>Authorized Gate Access Only • E-Cell Security Protocol</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SparkTheme.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    backgroundColor: 'rgba(14, 5, 31, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  partnerLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partnerLogo: {
    height: 34,
    width: 38,
  },
  partnerDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 12,
  },
  sparkLogoNav: {
    height: 32,
    width: 90,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    marginBottom: 16,
  },
  eyebrowText: {
    color: '#e879f9',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: SparkTheme.text,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 13,
    color: SparkTheme.textSecondary,
    letterSpacing: 0.8,
    fontWeight: '500',
    textAlign: 'center',
  },
  cardWrapper: {
    maxWidth: 440,
    marginBottom: 20,
  },
  cardInner: {
    padding: 22,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e879f9',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: SparkTheme.textSecondary,
    marginBottom: 20,
  },
  inputLabel: {
    color: SparkTheme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SparkTheme.inputBg,
    borderWidth: 1.4,
    borderColor: SparkTheme.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 52,
  },
  inputWrapperFocus: {
    borderColor: SparkTheme.lavender,
    backgroundColor: 'rgba(28, 12, 58, 0.85)',
    shadowColor: SparkTheme.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: SparkTheme.text,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: SparkTheme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  securityText: {
    color: SparkTheme.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
