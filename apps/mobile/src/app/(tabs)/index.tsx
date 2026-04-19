import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Text, SafeAreaView } from 'react-native';

// Mock data to visualize the structure before wiring up your API Client
const MOCK_ARTICLES = [
  { id: '1', source: 'The Verge', rank: '#1', time: '2h ago', title: 'OpenAI releases new reasoning model', isPaywalled: false },
  { id: '2', source: 'TechCrunch', rank: '#2', time: '4h ago', title: 'Apple Intelligence rollout begins', isPaywalled: true },
];

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API fetch
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={MOCK_ARTICLES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
        }
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>Good morning, Kyle</Text>
            <Text style={styles.headerTitle}>Your daily curated briefing</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Meta Row: Source, Rank, Time */}
            <View style={styles.metaRow}>
              <View style={styles.pill}><Text style={styles.pillText}>{item.source}</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>{item.rank}</Text></View>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>

            {/* Title */}
            <Text style={styles.articleTitle}>{item.title}</Text>

            {/* AI Summary Area (Placeholder for the Paywall Blur) */}
            <View style={[styles.summaryContainer, item.isPaywalled && styles.paywalledSummary]}>
              <Text style={styles.summaryText}>
                {item.isPaywalled
                  ? "✨ Premium AI Summary Locked"
                  : "AI Summary: This is where the 3-sentence extraction will live, giving you the immediate takeaways without the fluff."}
              </Text>
            </View>

            {/* Action Row: Thumbs Up / Down */}
            <View style={styles.actionRow}>
              <View style={styles.actionButton}><Text>👍</Text></View>
              <View style={styles.actionButton}><Text>👎</Text></View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  listContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerSubtitle: { fontSize: 14, color: '#666', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111', marginTop: 4 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  pill: { backgroundColor: '#F4F4F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '600', color: '#3F3F46' },
  timeText: { fontSize: 12, color: '#A1A1AA', marginLeft: 'auto' },
  articleTitle: { fontSize: 20, fontWeight: '700', color: '#18181B', marginBottom: 12, lineHeight: 26 },
  summaryContainer: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16 },
  paywalledSummary: { backgroundColor: '#EEF2FF', opacity: 0.7 },
  summaryText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' },
});