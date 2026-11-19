import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '@/lib/ui';

const icons: Record<string, string> = {
  index: '⌂',
  membership: '▤',
  classes: '▦',
  card: '▣',
  profile: '◉',
};

export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.deep,
    tabBarInactiveTintColor: '#829188',
    tabBarShowLabel: true,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 9,
      height: 72,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.9)',
      borderRadius: 22,
      backgroundColor: 'rgba(248,251,249,0.95)',
      shadowColor: '#213c2c',
      shadowOpacity: 0.13,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 7 },
      elevation: 12,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    tabBarIcon: ({ color, focused }) => <View style={{ alignItems: 'center', justifyContent: 'center', width: 33, height: 29, borderRadius: 11, backgroundColor: focused ? 'rgba(200,241,105,0.62)' : 'transparent' }}>
      <Text accessibilityElementsHidden style={{ color, fontSize: 21, lineHeight: 24, fontWeight: '700' }}>{icons[route.name]}</Text>
    </View>,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home' }} />
    <Tabs.Screen name="membership" options={{ title: 'My plan', tabBarAccessibilityLabel: 'My plan and history' }} />
    <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarAccessibilityLabel: 'Classes' }} />
    <Tabs.Screen name="card" options={{ title: 'My QR', tabBarAccessibilityLabel: 'My membership QR code' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile and account' }} />
  </Tabs>;
}
