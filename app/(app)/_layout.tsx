import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function AppLayout() {
  const { admin, isLoading } = useAuth();

  // Show a loading indicator while session is being verified
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Redirect to login if user is not authenticated
  if (!admin) {
    return <Redirect href="/login" />;
  }

  // Render the protected screens in a Stack
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="attendance" 
        options={{ 
          headerShown: true, 
          title: "Today's Attendance",
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600', fontSize: 18 }
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
    backgroundColor: '#111827', // Premium deep dark background
  },
});
