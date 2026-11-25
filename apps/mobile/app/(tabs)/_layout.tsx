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
    tabBarActiveTintColor: colors.lime,
    tabBarInactiveTintColor: '#91a2b5',
    tabBarShowLabel: true,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      position: 'absolute',
      left: 15,
      right: 15,
      bottom: 10,
      height: 72,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: '#263545',
      borderRadius: 21,
      backgroundColor: 'rgba(17,26,37,0.97)',
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 14,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 2 },
    tabBarIcon: ({ color, focused }) => <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 35,
      height: 31,
      borderRadius: 11,
      backgroundColor: focused ? 'rgba(200,241,105,0.14)' : 'transparent',
      borderWidth: focused ? 1 : 0,
      borderColor: 'rgba(200,241,105,0.35)',
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
