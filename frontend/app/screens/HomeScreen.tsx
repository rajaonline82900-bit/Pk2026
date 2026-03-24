import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Result {
  id?: string;
  market_id: string;
  market_name: string;
  market_name_hindi: string;
  date: string;
  opening?: string;
  closing?: string;
  jodi?: string;
  created_at: string;
}

const HomeScreen = ({ navigation }: any) => {
  const [results, setResults] = useState<Result[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/results/latest`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateAllResults = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/generate-all-results`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('सफलता', 'सभी मार्केट के परिणाम जनरेट हो गए');
        fetchResults();
      }
    } catch (error) {
      Alert.alert('त्रुटि', 'परिणाम जनरेट नहीं हो सके');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResults();
  };

  const renderResultCard = ({ item }: { item: Result }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('History', { marketId: item.market_id, marketName: item.market_name_hindi })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.marketName}>{item.market_name_hindi}</Text>
          <Text style={styles.marketNameEng}>{item.market_name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>

      <View style={styles.resultContainer}>
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>ओपन</Text>
          <Text style={styles.resultValue}>{item.opening || '--'}</Text>
        </View>

        <View style={[styles.resultBox, styles.jodiBox]}>
          <Text style={styles.resultLabel}>जोड़ी</Text>
          <Text style={[styles.resultValue, styles.jodiValue]}>
            {item.jodi || '--'}
          </Text>
        </View>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>क्लोज</Text>
          <Text style={styles.resultValue}>{item.closing || '--'}</Text>
        </View>
      </View>

      {(!item.opening || !item.closing || !item.jodi) && (
        <View style={styles.waitingBadge}>
          <Text style={styles.waitingText}>परिणाम की प्रतीक्षा है...</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>मटका किंग</Text>
          <Text style={styles.headerSubtitle}>लाइव परिणाम</Text>
        </View>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateAllResults}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.generateButtonText}>जनरेट</Text>
        </TouchableOpacity>
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        renderItem={renderResultCard}
        keyExtractor={(item) => item.market_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
            colors={['#4CAF50']}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  marketName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  marketNameEng: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  resultContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultBox: {
    flex: 1,
    backgroundColor: '#0f0f23',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  jodiBox: {
    backgroundColor: '#2a2a3e',
  },
  resultLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  jodiValue: {
    color: '#4CAF50',
  },
  waitingBadge: {
    marginTop: 12,
    backgroundColor: '#2a2a3e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  waitingText: {
    color: '#ffd700',
    fontSize: 12,
  },
});

export default HomeScreen;
