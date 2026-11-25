import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '@/lib/ui';

const icons: Record<string, string> = {
  index: '⌂',
  membership: '◫',
  classes: '▦',
  card: '▣',
  profile: '◉',
};

export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.deep,
    tabBarInactiveTintColor: '#7d8c83',
    tabBarShowLabel: true,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      position: 'absolute',
      left: 15,
      right: 15,
      bottom: 10,
      height: 76,
      paddingTop: 9,
      paddingBottom: 9,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.88)',
      borderRadius: 25,
      backgroundColor: 'rgba(248,252,249,0.88)',
      shadowColor: '#203b2b',
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
      elevation: 14,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 2 },
    tabBarIcon: ({ color, focused }) => <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 35,
      height: 31,
      borderRadius: 12,
      backgroundColor: focused ? 'rgba(212,244,119,0.76)' : 'rgba(255,255,255,0.18)',
      borderWidth: focused ? 1 : 0,
      borderColor: 'rgba(255,255,255,0.85)',
    }}>
      <Text accessibilityElementsHidden style={{ color, fontSize: 21, lineHeight: 25, fontWeight: '800' }}>{icons[route.name]}</Text>
    </View>,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home' }} />
    <Tabs.Screen name="membership" options={{ title: 'Plan', tabBarAccessibilityLabel: 'My plan and history' }} />
    <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarAccessibilityLabel: 'Classes' }} />
    <Tabs.Screen name="card" options={{ title: 'My QR', tabBarAccessibilityLabel: 'My membership QR code' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile and account' }} />
  </Tabs>;
}
