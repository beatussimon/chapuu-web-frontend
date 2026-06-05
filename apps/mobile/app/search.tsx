import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowLeft, X, Store as StoreIcon, Star, MapPin, TrendingUp, History, ChevronRight, Plus, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, borderRadius } from '../theme';
import OptimizedImage from '../components/OptimizedImage';
import ScalePressable, { ScaleIconButton } from '../components/ScalePressable';
import PriceDisplay from '../components/PriceDisplay';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { SkeletonSearchList } from '../components/SkeletonCards';

interface SearchResultStore {
  id: number;
  name: string;
  store_type: 'RESTAURANT' | 'SHOP';
  location: string;
  image_url: string | null;
  avg_rating: number;
  distance_km?: number;
  is_open: boolean;
}

interface SearchResultProduct {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
  store_id: number;
  store_name: string;
  description: string;
}

interface SearchResultCategory {
  id: number;
  name: string;
  product_count: number;
}

interface SearchResults {
  stores: SearchResultStore[];
  products: SearchResultProduct[];
  categories: SearchResultCategory[];
}

const RECENT_SEARCHES_KEY = 'chapuu_recent_searches';

export default function SearchScreen() {
  const router = useRouter();
  const { userLocation } = useUser();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ stores: [], products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>(['Pizza', 'Burger', 'Sushi', 'Grocery', 'Pharmacy']);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {}
  };

  const saveRecentSearch = async (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 10);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {}
  };

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setResults({ stores: [], products: [], categories: [] });
      setQuery(term);
      return;
    }
    setLoading(true);
    setQuery(term);
    try {
      const params: any = {
        q: term,
        type: 'all'
      };

      if (userLocation.granted && userLocation.lat && userLocation.lng) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.radius = 25.0; // Increased radius for better discovery
      }

      const res = await apiClient.get('/search/', { params });
      const data = res.data?.results || res.data || {};
      
      setResults({
        stores: Array.isArray(data.stores) ? data.stores : [],
        products: Array.isArray(data.products) ? data.products : [],
        categories: Array.isArray(data.categories) ? data.categories : []
      });
      
      saveRecentSearch(term);
    } catch (err) {
      console.warn("[Search] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStorePress = (id: number) => {
    router.push(`/(tabs)/tab2?store=${id}`);
  };

  const handleProductPress = (storeId: number, productId: number) => {
    router.push(`/(tabs)/tab2?store=${storeId}&highlight=${productId}`);
  };

  const hasResults = results.stores.length > 0 || results.products.length > 0 || results.categories.length > 0;
  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ScaleIconButton onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </ScaleIconButton>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search stores or items..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => performSearch(query)}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <ScaleIconButton onPress={() => { setQuery(''); setResults({ stores: [], products: [], categories: [] }); }}>
              <X size={18} color={colors.text.tertiary} />
            </ScaleIconButton>
          )}
        </View>
      </View>

      {loading ? (
        <SkeletonSearchList count={5} />
      ) : isSearching && !hasResults ? (
        <View style={styles.emptyResults}>
          <Search size={64} color="rgba(255, 255, 255, 0.05)" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyDesc}>We couldn't find anything matching "{query}". Try a different search term.</Text>
          <ScalePressable 
            style={{ backgroundColor: colors.primary[500], paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 }} 
            onPress={() => { triggerLightHaptic(); setQuery(''); setResults({ stores: [], products: [], categories: [] }); }}
          >
            <Text style={{ color: '#020617', fontSize: 16, fontWeight: 'bold' }}>Clear Search</Text>
          </ScalePressable>
        </View>
      ) : hasResults ? (
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          {results.categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={14} color={colors.primary[500]} />
                <Text style={styles.sectionTitle}>Categories</Text>
              </View>
              <View style={styles.chips}>
                {results.categories.map(cat => (
                  <ScalePressable key={cat.id} style={styles.chip} onPress={() => performSearch(cat.name)}>
                    <Text style={styles.chipText}>{cat.name}</Text>
                    <Text style={styles.chipCount}>{cat.product_count}</Text>
                  </ScalePressable>
                ))}
              </View>
            </View>
          )}

          {results.stores.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <StoreIcon size={14} color={colors.primary[500]} />
                <Text style={styles.sectionTitle}>Stores & Spots</Text>
              </View>
              {results.stores.map(store => (
                <ScalePressable key={`store-${store.id}`} style={styles.resultCard} onPress={() => handleStorePress(store.id)}>
                  <OptimizedImage src={store.image_url || undefined} wrapperStyle={styles.resultImage} placeholderType="store" storeType={store.store_type} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{store.name}</Text>
                    <View style={styles.resultMeta}>
                      <Text style={[styles.resultType, { color: store.store_type === 'SHOP' ? '#c084fc' : colors.primary[400] }]}>{store.store_type}</Text>
                      <Text style={styles.metaDivider}>·</Text>
                      <Star size={12} color={colors.primary[500]} fill={colors.primary[500]} />
                      <Text style={styles.resultRating}>{Number(store.avg_rating || 4.5).toFixed(1)}</Text>
                      {store.distance_km !== undefined && (
                        <>
                          <Text style={styles.metaDivider}>·</Text>
                          <Text style={styles.resultDistance}>{store.distance_km.toFixed(1)} km</Text>
                        </>
                      )}
                    </View>
                    <Text style={styles.resultLocation} numberOfLines={1}>{store.location || 'Online'}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.text.tertiary} />
                </ScalePressable>
              ))}
            </View>
          )}

          {results.products.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={14} color={colors.primary[500]} />
                <Text style={styles.sectionTitle}>Items & Meals</Text>
              </View>
              {results.products.map(product => (
                <ScalePressable key={`prod-${product.id}`} style={styles.resultCard} onPress={() => handleProductPress(product.store_id, product.id)}>
                  <OptimizedImage src={product.image_url || undefined} wrapperStyle={styles.resultImage} placeholderType="product" />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{product.name}</Text>
                    <View style={styles.resultMeta}>
                      <StoreIcon size={12} color={colors.primary[500]} />
                      <Text style={styles.resultStoreName}>{product.store_name}</Text>
                    </View>
                    <PriceDisplay amount={product.price} style={styles.resultPrice} />
                  </View>
                  <View style={styles.addBadge}>
                    <Plus size={16} color={colors.dark[950]} />
                  </View>
                </ScalePressable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <History size={16} color={colors.text.secondary} />
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <ScalePressable onPress={clearRecentSearches}>
                  <Text style={styles.clearBtn}>Clear</Text>
                </ScalePressable>
              </View>
              <View style={styles.chips}>
                {recentSearches.map((s, i) => (
                  <ScalePressable key={i} style={styles.chip} onPress={() => performSearch(s)}>
                    <Text style={styles.chipText}>{s}</Text>
                  </ScalePressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color={colors.primary[500]} />
              <Text style={styles.sectionTitle}>Trending Searches</Text>
            </View>
            <View style={styles.chips}>
              {trendingSearches.map((s, i) => (
                <ScalePressable key={i} style={[styles.chip, styles.trendingChip]} onPress={() => performSearch(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </ScalePressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    padding: spacing.xs,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[900],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    padding: spacing.md,
    gap: spacing.xl,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  resultType: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  resultStoreName: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  metaDivider: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  resultRating: {
    fontSize: 11,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  resultDistance: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  resultLocation: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  resultPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary[400],
  },
  addBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text.primary,
    marginTop: spacing.xl,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyState: {
    padding: spacing.xl,
    gap: spacing['2xl'],
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  clearBtn: {
    fontSize: 11,
    color: colors.primary[400],
    fontWeight: 'bold',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingChip: {
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  chipText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipCount: {
    fontSize: 10,
    color: colors.text.tertiary,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 4,
    borderRadius: 4,
  }
});
