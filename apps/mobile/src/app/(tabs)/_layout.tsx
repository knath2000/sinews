import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

export default function TabLayout() {
  const { theme, isDark } = useTheme();

  const activeTint = isDark ? theme.accent : theme.text;
  const inactiveTint = isDark ? theme.textDim : theme.textDim;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.bg },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: 'Newsreader',
          fontWeight: '700',
          fontSize: 20,
          color: theme.text,
        },
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          backgroundColor: theme.surface1,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexSans',
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Feather name="book-open" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
