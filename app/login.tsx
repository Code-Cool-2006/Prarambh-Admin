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
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFocus, setUserFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // References to force focus on input when tapping the outer container
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!username || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert('Required Fields', 'Please fill in all fields.');
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await login(username, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // AuthProvider triggers the redirect to /(app)/index.tsx automatically
      router.replace('/');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.message === 'Not an admin account'
        ? 'This account does not have admin access.'
        : 'Invalid username or password.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.contentContainer}>
        {/* Animated/Gradient Logo Circle */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.logoContainer}
        >
          <Ionicons name="qr-code-sharp" size={48} color="#ffffff" />
        </LinearGradient>

        <Text style={s.title}>Prarambh Attendance</Text>
        <Text style={s.sub}>Admin Portal Access</Text>

        <View style={s.form}>
          <Text style={s.inputLabel}>Username</Text>
          <Pressable 
            style={[s.inputWrapper, userFocus && s.inputWrapperFocus]}
            onPress={() => usernameInputRef.current?.focus()}
          >
            <Ionicons name="person-outline" size={20} color={userFocus ? '#10B981' : '#9CA3AF'} style={s.inputIcon} />
            <TextInput
              ref={usernameInputRef}
              style={s.input}
              placeholder="Enter your username"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              onFocus={() => setUserFocus(true)}
              onBlur={() => setUserFocus(false)}
              editable={!loading}
            />
          </Pressable>

          <Text style={s.inputLabel}>Password</Text>
          <Pressable 
            style={[s.inputWrapper, passFocus && s.inputWrapperFocus]}
            onPress={() => passwordInputRef.current?.focus()}
          >
            <Ionicons name="lock-closed-outline" size={20} color={passFocus ? '#10B981' : '#9CA3AF'} style={s.inputIcon} />
            <TextInput
              ref={passwordInputRef}
              style={s.input}
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Pressable>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.gradientBtn}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s.btnText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    justifyContent: 'center',
    padding: 24,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC', // Slate 50
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 14,
    color: '#94A3B8', // Slate 400
    marginBottom: 36,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B', // Slate 800
    borderWidth: 1.5,
    borderColor: '#334155', // Slate 700
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 56,
  },
  inputWrapperFocus: {
    borderColor: '#10B981', // Emerald 500
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  btn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  gradientBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
