import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatTile } from '../../components/StatTile';
import { Toggle } from '../../components/Toggle';
import { Text } from '../../components/Text';
import { useTheme } from '../../lib/theme';
import { useAuthState, authSignOut } from '../../contexts/AuthContext';
import { spacing, radii, fontSize, fontFamily } from '../../lib/tokens';

export default function SettingsScreen() {
  const { theme, isDark, setThemeMode, themeMode } = useTheme();
  const { user, isLoading } = useAuthState();
  const router = useRouter();

  // Redirect to auth if user is not signed in (sign-out happened elsewhere)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading]);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authSignOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={{ fontSize: fontSize.small, color: theme.textDim, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Settings — {displayName}
        </Text>
        <Text variant="heading" style={{ marginTop: spacing.xs }}>
          Control your briefing, connections, and privacy.
        </Text>
      </View>

      {/* Stat Tiles */}
      <View style={styles.tilesRow}>
        <StatTile value="0" label="linked accounts" />
        <StatTile value="0" label="active topics" />
        <StatTile value="169" label="active signals" />
      </View>

      {/* Profile Section */}
      <View style={[styles.section, {
        backgroundColor: theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.card,
      }]}>
        <Text variant="heading" style={{ marginBottom: spacing.md }}>
          Display name & timezone
        </Text>
        <Text variant="caption" color={theme.textDim} style={{ marginBottom: spacing.lg }}>
          Customize how your briefing addresses you
        </Text>

        <View style={styles.formField}>
          <Text variant="label" color={theme.textMuted} style={{ marginBottom: spacing.sm }}>
            Display Name
          </Text>
          <View style={[styles.input, {
            backgroundColor: theme.surface2,
            borderColor: theme.border,
          }]}>
            <Text variant="body" color={theme.text}>{displayName}</Text>
          </View>
        </View>

        <View style={[styles.formField, { marginTop: spacing.md }]}>
          <Text variant="label" color={theme.textMuted} style={{ marginBottom: spacing.sm }}>
            Timezone
          </Text>
          <View style={[styles.input, {
            backgroundColor: theme.surface2,
            borderColor: theme.border,
          }]}>
            <Text variant="body" color={theme.text}>America/Los_Angeles</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, {
            backgroundColor: theme.accent,
          }]}
          activeOpacity={0.7}
        >
          <Text variant="body" style={{
            color: isDark ? theme.bg : theme.surface1,
            fontWeight: '600',
          }}>
            Save Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appearance */}
      <View style={[styles.section, {
        backgroundColor: theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.card,
      }]}>
        <Toggle
          label="Dark mode"
          isActive={isDark}
          onToggle={() => setThemeMode(isDark ? 'light' : 'dark')}
          style={{ borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }}
        />
      </View>

      {/* Brief Time */}
      <View style={[styles.section, {
        backgroundColor: theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.card,
      }]}>
        <Text variant="heading" style={{ marginBottom: spacing.sm }}>
          Brief Delivery Time
        </Text>
        <Text variant="body" color={theme.textMuted} style={{ marginBottom: spacing.md }}>
          Set the local hour when your daily briefing will be ready. Your brief is generated shortly before this time.
        </Text>
        <View style={[styles.input, {
          backgroundColor: theme.surface2,
          borderColor: theme.border,
        }]}>
          <Text variant="body" color={theme.text}>4:00 AM</Text>
        </View>
      </View>

      {/* Topic Preferences */}
      <View style={[styles.section, {
        backgroundColor: theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.card,
      }]}>
        <Text variant="heading" style={{ marginBottom: spacing.sm }}>
          TopicPreferences
        </Text>
        <Text variant="body" color={theme.textMuted}>
          These topics influence which articles appear in your briefing. We auto-detect interests from your linked accounts.
        </Text>
        <View style={[styles.pillRow, { marginTop: spacing.md }]}>
          {['developer tools', 'cloud computing', 'artificial intelligence'].map((topic) => (
            <View key={topic} style={[styles.topicPill, {
              backgroundColor: theme.surface2,
              borderColor: theme.border,
              borderRadius: theme.pillRadius,
            }]}>
              <Text variant="caption" color={theme.textMuted}>{topic}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Privacy Policy */}
      <TouchableOpacity style={[styles.section, {
        backgroundColor: theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.card,
      }]} activeOpacity={0.7}>
        <Text variant="body" color={theme.text}>Privacy Policy</Text>
      </TouchableOpacity>

      {/* Terms of Service */}
      <TouchableOpacity style={[styles.section, {
        backgroundColor: theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.card,
      }]} activeOpacity={0.7}>
        <Text variant="body" color={theme.text}>Terms of Service</Text>
      </TouchableOpacity>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutButton, { marginTop: spacing.lg }]}
        activeOpacity={0.7}
        onPress={handleSignOut}
      >
        <Text variant="body" style={{ color: '#ef4444', fontWeight: '600', fontFamily: fontFamily.body }}>
          Sign Out
        </Text>
      </TouchableOpacity>

      {/* Spacer for bottom tab bar */}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  formField: {},
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.input,
    borderWidth: 1,
  },
  saveButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  signOutButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
});
