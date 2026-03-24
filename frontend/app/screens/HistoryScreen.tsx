import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
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

const HistoryScreen = ({ route }: any) => {
  const { marketId, marketName } = route.params;
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [marketId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/results/history?market_id=${marketId}&limit=30`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderResultRow = ({ item }: { item: Result }) => (
    <View style={styles.row}>
      <Text style={styles.dateCell}>{formatDate(item.date)}</Text>
      <Text style={styles.cell}>{item.opening || '--'}</Text>
      <Text style={[styles.cell, styles.jodiCell]}>{item.jodi || '--'}</Text>
      <Text style={styles.cell}>{item.closing || '--'}</Text>
    </View>
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('hi-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Market Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.marketTitle}>{marketName}</Text>
        <Text style={styles.subtitle}>पिछले 30 परिणाम</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerCell}>तारीख</Text>
        <Text style={styles.headerCell}>ओपन</Text>
        <Text style={styles.headerCell}>जोड़ी</Text>
        <Text style={styles.headerCell}>क्लोज</Text>
      </View>

      {/* Results List */}
      {results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>कोई परिणाम नहीं मिला</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResultRow}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  marketTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  headerCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  dateCell: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  jodiCell: {
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default HistoryScreen;
