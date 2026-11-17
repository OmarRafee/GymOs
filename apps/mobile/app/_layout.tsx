import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '@/lib/session';
import { colors } from '@/lib/ui';

export default function RootLayout() {
  return <SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvas }, headerShadowVisible: false, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.canvas } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="login" options={{ title: 'Sign in' }} /><Stack.Screen name="signup" options={{ title: 'Create account' }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="link-member" options={{ title: 'Link gym membership' }} /><Stack.Screen name="scan" options={{ title: 'Scan member QR' }} /></Stack></SessionProvider>;
}
