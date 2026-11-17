import { Tabs } from 'expo-router';
import { colors } from '@/lib/ui';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.deep, tabBarInactiveTintColor: '#89958e', tabBarStyle: { height: 61, paddingTop: 7, paddingBottom: 7, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 10, fontWeight: '600' } }}><Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} /><Tabs.Screen name="membership" options={{ title: 'Membership', tabBarLabel: 'Plan' }} /><Tabs.Screen name="classes" options={{ title: 'Classes', tabBarLabel: 'Classes' }} /><Tabs.Screen name="card" options={{ title: 'Digital card', tabBarLabel: 'My QR' }} /><Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} /></Tabs>;
}
