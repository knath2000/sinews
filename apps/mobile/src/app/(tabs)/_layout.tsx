import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
// You can install expo-symbols for native iOS icons later, using basic text/shapes for v1
import { colors, spacing } from '../../lib/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false, // Clean, flat look mimicking web
        headerTitleStyle: { fontWeight: '700', fontSize: 20 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Briefing',
          tabBarLabel: 'Feed',
          // Placeholder icon
          tabBarIcon: ({ color }: { color: string }) => (
            <View style={[styles.iconPlaceholder, { backgroundColor: color }]} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          // Placeholder icon
          tabBarIcon: ({ color }: { color: string }) => (
            <View style={[styles.iconPlaceholder, { backgroundColor: color }]} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    elevation: 0,
    shadowOpacity: 0,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 6,
    opacity: 0.8,
  },
});
