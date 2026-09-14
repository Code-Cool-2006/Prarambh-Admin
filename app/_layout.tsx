import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/src/context/AuthContext';
import { SparkTheme } from '@/constants/theme';

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: SparkTheme.bg,
    card: SparkTheme.surface,
    text: SparkTheme.text,
    border: SparkTheme.cardBorder || 'rgba(139, 92, 246, 0.25)',
    primary: SparkTheme.accent,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={customDarkTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SparkTheme.bg } }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="login" options={{ gestureEnabled: false }} />
          </Stack>
          <StatusBar style="light" backgroundColor={SparkTheme.bg} />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
