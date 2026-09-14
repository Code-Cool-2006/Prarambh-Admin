import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SparkTheme } from '@/constants/theme';

export default function AppLayout() {
  const { admin, isLoading } = useAuth();

  // Show a loading indicator while session is being verified
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={SparkTheme.accent} />
      </View>
    );
  }

  // Redirect to login if user is not authenticated
  if (!admin) {
    return <Redirect href="/login" />;
  }

  // Render the protected screens in a Stack
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: SparkTheme.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="attendance" 
        options={{ 
          headerShown: true, 
          title: "Attendance & Pass Logs",
          headerStyle: { backgroundColor: SparkTheme.bg },
          headerTintColor: '#e879f9',
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800', fontSize: 16, color: SparkTheme.text },
          headerBackTitle: 'Scanner',
        }} 
      />
    </Stack>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SparkTheme.bg,
  },
});
