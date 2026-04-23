import { useState, useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { useTheme } from '../../lib/theme';
import { spacing } from '../../lib/tokens';
import { apiClient, FeedArticle } from '../../lib/apiClient';
import { useAuthState } from '../../contexts/AuthContext';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function FeedScreen() {
  const { theme, isDark } = useTheme();
  const { user, isLoading } = useAuthState();
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const { articles: brief } = await apiClient.getBrief();
      setArticles(brief?.articles ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load briefing';
      setError(message);
      console.error('Failed to fetch feed:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFeed().finally(() => setLoading(false));
    } else if (!isLoading) {
      // Auth gate will redirect, but we need to reset loading state
      setLoading(false);
    }
  }, [fetchFeed, user, isLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  // Still loading auth or still fetching feed
  if (isLoading || (user && loading)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isDark ? theme.accent : theme.textDim} />
          <Text variant="caption" color={theme.textMuted} style={{ marginTop: spacing.md }}>
            {isLoading ? 'Loading...' : 'Loading your briefing...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && articles.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.centered}>
          <Text variant="body" color={theme.textDim}>
            Could not load briefing
          </Text>
          <Text variant="caption" color={theme.textMuted} style={{ marginTop: spacing.xs }}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <Text variant="subheading" color={theme.textDim}>Your daily briefing</Text>
        <Text variant="display" color={theme.text} style={{ marginTop: spacing.xs }}>
          {articles.length} article{articles.length !== 1 ? 's' : ''} today
        </Text>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? theme.accent : theme.text}
          />
        }
        renderItem={({ item }) => (
          <Card
            source={item.source_name}
            rank=""
            time={timeAgo(item.published_at)}
            title={item.title}
            summary={item.summary ?? item.snippet ?? ''}
            isPaywalled={item.is_paywalled}
            style={styles.cardSpacing}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text variant="body" color={theme.textDim}>No articles in your briefing yet.</Text>
            <Text variant="caption" color={theme.textMuted} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              Your briefing is being generated. Check back in a moment.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  cardSpacing: {
    marginBottom: 0,
  },
});
