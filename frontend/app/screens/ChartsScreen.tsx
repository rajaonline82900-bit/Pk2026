import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Market {
  id: string;
  name: string;
  name_hindi: string;
  open_time: string;
  close_time: string;
}

const ChartsScreen = ({ navigation }: any) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/markets`);
      const data = await response.json();
      setMarkets(data);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMarketCard = ({ item }: { item: Market }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('History', {
          marketId: item.id,
          marketName: item.name_hindi,
        })
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="bar-chart" size={32} color="#4CAF50" />
        </View>
        <View style={styles.marketInfo}>
          <Text style={styles.marketName}>{item.name_hindi}</Text>
          <Text style={styles.marketNameEng}>{item.name}</Text>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color="#999" />
            <Text style={styles.timeText}>
              {item.open_time} - {item.close_time}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>चार्ट देखें</Text>
          <Text style={styles.headerSubtitle}>मार्केट का इतिहास</Text>
        </View>
      </View>

      {/* Markets List */}
      <FlatList
        data={markets}
        renderItem={renderMarketCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
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
  header: {
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
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#0f0f23',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  marketInfo: {
    flex: 1,
  },
  marketName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  marketNameEng: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ChartsScreen;
