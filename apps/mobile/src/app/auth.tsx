import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authSignIn, authSignUp } from '../contexts/AuthContext';
import { useTheme } from '../lib/theme';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { spacing, radii, fontSize, fontFamily } from '../lib/tokens';

export default function AuthScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result =
        mode === 'signIn'
          ? await authSignIn(email.trim().toLowerCase(), password)
          : await authSignUp(email.trim().toLowerCase(), password);

      if (result.error) {
        setError(result.error);
      } else if ('needsConfirmation' in result && result.needsConfirmation) {
        setPendingConfirmation(true);
      } else if (!result.error) {
        // Sign-in succeeded — redirect to feed
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, router]);

  if (pendingConfirmation) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={[styles.card, { backgroundColor: theme.surface1, borderColor: theme.border, borderWidth: 1, borderRadius: radii.card }]}>
            <Text style={[styles.heading, { fontFamily: fontFamily.display, fontWeight: '700', color: theme.text }]}>
              Check your email
            </Text>
            <Text style={[styles.subtext, { fontFamily: fontFamily.body, color: theme.textMuted, marginTop: spacing.sm }]}>
              We sent a confirmation link to {email}. Click the link in your email, then come back and sign in.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: isDark ? theme.accent : theme.accent }]}
              activeOpacity={0.7}
              onPress={() => {
                setMode('signIn');
                setPendingConfirmation(false);
                setError(null);
              }}
            >
              <Text style={[styles.buttonText, { fontFamily: fontFamily.body }]}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.formContent}>
        {!isSupabaseConfigured && (
          <View style={[styles.card, { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: radii.card, marginBottom: spacing.md }]}>
            <Text style={{ fontFamily: fontFamily.body, fontWeight: '700', color: '#dc2626', fontSize: fontSize.large }}>
              Supabase Not Configured
            </Text>
            <Text style={{ fontFamily: fontFamily.body, color: '#b91c1c', fontSize: fontSize.small, marginTop: spacing.xs }}>
              Add your real credentials to apps/mobile/.env.local:
            </Text>
            <Text style={[styles.monoText, { marginTop: spacing.sm }]}>
              EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{'\n'}
              EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here{'\n'}
              EXPO_PUBLIC_API_URL=http://localhost:3000
            </Text>
          </View>
        )}
        <View style={[styles.card, { backgroundColor: theme.surface1, borderColor: theme.border, borderWidth: 1, borderRadius: radii.card }]}>
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'signIn' && { backgroundColor: isDark ? theme.surface2 : theme.bg },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setMode('signIn');
                setError(null);
                setPendingConfirmation(false);
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: mode === 'signIn' ? theme.text : theme.textMuted },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'signUp' && { backgroundColor: isDark ? theme.surface2 : theme.bg },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setMode('signUp');
                setError(null);
                setPendingConfirmation(false);
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: mode === 'signUp' ? theme.text : theme.textMuted },
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.heading, { fontFamily: fontFamily.display, fontWeight: '700', color: theme.text }]}>
            {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={[styles.subtext, { fontFamily: fontFamily.body, color: theme.textMuted, marginTop: spacing.xs }]}>
            {mode === 'signIn'
              ? 'Sign in to access your daily briefing'
              : 'Get personalized AI news, curated for you'}
          </Text>

          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { fontFamily: fontFamily.body, color: theme.textMuted }]}>
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface2,
                  borderColor: theme.border,
                  borderRadius: radii.input,
                  borderWidth: 1,
                  color: theme.text,
                  fontFamily: fontFamily.body,
                },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Password */}
          <View style={[styles.field, { marginTop: spacing.md }]}>
            <Text style={[styles.label, { fontFamily: fontFamily.body, color: theme.textMuted }]}>
              Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface2,
                  borderColor: theme.border,
                  borderRadius: radii.input,
                  borderWidth: 1,
                  color: theme.text,
                  fontFamily: fontFamily.body,
                },
              ]}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Error */}
          {error && (
            <Text style={[styles.errorText, { color: '#ef4444', marginTop: spacing.sm }]}>
              {error}
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
            activeOpacity={0.7}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? theme.bg : theme.surface1} />
            ) : (
              <Text style={[styles.buttonText, { fontFamily: fontFamily.body }]}>
                {mode === 'signIn' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          {mode === 'signIn' && (
            <TouchableOpacity style={{ marginTop: spacing.md, alignSelf: 'center' }} activeOpacity={0.7}>
              <Text style={{ color: theme.accent, fontFamily: fontFamily.body, fontSize: fontSize.small }}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  formContent: {
    padding: spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    padding: spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.input,
    alignItems: 'center',
  },
  modeButtonText: {
    fontFamily: fontFamily.body,
    fontWeight: '600',
    fontSize: fontSize.small,
  },
  heading: {
    fontSize: fontSize.large * 1.3,
  },
  subtext: {
    fontSize: fontSize.medium,
    lineHeight: fontSize.medium * 1.5,
  },
  field: {
    marginTop: spacing.lg,
  },
  label: {
    fontSize: fontSize.small,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorText: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.body,
  },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fontSize.medium,
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: fontSize.small,
    color: '#991b1b',
    lineHeight: fontSize.small * 1.5,
  },
});
