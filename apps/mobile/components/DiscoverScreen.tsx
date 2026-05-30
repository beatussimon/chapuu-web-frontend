import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, SlidersHorizontal, TrendingUp, Store as StoreIcon, Heart, Navigation, ChevronRight, Star, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, typography, borderRadius } from '../theme';
import OptimizedImage from './OptimizedImage';
import PriceDisplay from './PriceDisplay';
import LoadingSkeleton from './LoadingSkeleton';
import ScalePressable from './ScalePressable';
import { triggerLightHaptic } from '../hooks/useHaptics';

interface StatMetrics {
  total_stores: number;
  total_meals_served: number;
}

interface Store {
  id: number;
  name: string;
  store_type: 'RESTAURANT' | 'SHOP';
  location: string;
  image_url: string | null;
  distance_km?: number;
  avg_rating: number;
  working_hours: string;
  is_open: boolean;
}

interface TrendingItem {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
  store_id: number;
  store_name: string;
  times_ordered: number;
  distance_km?: number;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { token, userLocation, requestLocationPermission, savedStores, updateSavedStores } = useUser();
  const isAuthenticated = !!token;
  
  const [metrics, setMetrics] = useState<StatMetrics | null>(null);
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const params: any = {};
      if (userLocation.granted && userLocation.lat && userLocation.lng) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }

      const [statsRes, storesRes] = await Promise.all([
        apiClient.get('/stats/billboard/', { params }),
        apiClient.get('/stores/', { params })
      ]);

      if (statsRes.data) {
        setMetrics(statsRes.data.metrics);
        setTrendingItems(statsRes.data.trending_items || []);
      }
      if (storesRes.data) {
        setStores(storesRes.data.results || storesRes.data || []);
      }
    } catch (err) {
      console.warn('[Discover] Failed to load data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userLocation.granted, userLocation.lat, userLocation.lng]);

  const onRefresh = () => {
    setRefreshing(true);
    triggerLightHaptic();
    loadData();
  };

  const handleStorePress = (storeId: number) => {
    triggerLightHaptic();
    router.push(`/(tabs)/tab2?store=${storeId}`);
  };

  const toggleSavedStore = (storeId: number) => {
    triggerLightHaptic();
    if (savedStores.includes(storeId)) {
      updateSavedStores(savedStores.filter(id => id !== storeId));
    } else {
      updateSavedStores([...savedStores, storeId]);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.headerTextContainer}>
        <Text style={styles.title}>
          {isAuthenticated ? "What are you craving?" : "Discover & Order."}
        </Text>
        
        {userLocation.granted && userLocation.name ? (
          <View style={styles.locationContainer}>
            <Navigation size={12} color={colors.primary[400]} />
            <Text style={styles.locationText}>
              Delivering to: <Text style={styles.locationName}>{userLocation.name}</Text>
            </Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>
            {metrics?.total_stores ?? '...'} spots delivering {metrics?.total_meals_served ?? '...'} meals.
          </Text>
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals, spots, categories..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <SlidersHorizontal size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {!userLocation.granted && (
        <View style={styles.locationPrompt}>
          <View style={styles.locationPromptTextContainer}>
            <MapPin size={12} color={colors.primary[400]} />
            <Text style={styles.locationPromptText}>Enable location to get nearby spots!</Text>
          </View>
          <TouchableOpacity style={styles.locationPromptBtn} onPress={requestLocationPermission}>
            <Text style={styles.locationPromptBtnText}>Turn On</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSkeletons = () => (
    <View style={{ padding: spacing.md }}>
      <LoadingSkeleton style={{ height: 200, width: '100%', marginBottom: spacing.lg }} />
      <LoadingSkeleton style={{ height: 30, width: 200, marginBottom: spacing.md }} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <LoadingSkeleton style={{ height: 240, width: 160 }} />
        <LoadingSkeleton style={{ height: 240, width: 160 }} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderSkeletons()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}

        {/* Trending Section */}
        {trendingItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>
                {userLocation.granted ? "Trending Nearby" : "Trending Right Now"}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {trendingItems.slice(0, 4).map(item => (
                <ScalePressable key={item.id} onPress={() => handleStorePress(item.store_id)} style={styles.card}>
                  <View style={styles.cardImageContainer}>
                    <OptimizedImage
                      src={item.image_url || ''}
                      placeholderType="product"
                      wrapperStyle={styles.cardImage}
                    />
                    <BlurView intensity={80} tint="dark" style={styles.badgeTopLeft}>
                      <MapPin size={9} color={colors.primary[400]} />
                      <Text style={styles.badgeText}>{item.distance_km ?? '?'} km</Text>
                    </BlurView>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.cardSubtitleContainer}>
                      <StoreIcon size={11} color={colors.primary[500]} />
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{item.store_name}</Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <PriceDisplay amount={item.price} style={styles.price} />
                    </View>
                  </View>
                </ScalePressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Directory Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <StoreIcon size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>
              {userLocation.granted ? "Closest spots to you" : "Discover spots"}
            </Text>
          </View>
          <View style={styles.grid}>
            {stores.map(store => (
              <ScalePressable key={store.id} onPress={() => handleStorePress(store.id)} style={[styles.card, styles.gridCard]}>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => toggleSavedStore(store.id)}
                >
                  <Heart size={16} color={savedStores.includes(store.id) ? colors.error : colors.text.secondary} fill={savedStores.includes(store.id) ? colors.error : 'transparent'} />
                </TouchableOpacity>
                <View style={styles.cardImageContainer}>
                  <OptimizedImage
                    src={store.image_url || ''}
                    placeholderType="store"
                    storeType={store.store_type}
                    wrapperStyle={styles.cardImage}
                  />
                  {store.distance_km !== undefined && (
                    <BlurView intensity={80} tint="dark" style={styles.badgeTopLeft}>
                      <MapPin size={9} color={colors.primary[400]} />
                      <Text style={styles.badgeText}>{store.distance_km} km</Text>
                    </BlurView>
                  )}
                  <BlurView intensity={80} tint="dark" style={styles.badgeBottomLeft}>
                    <Text style={[styles.badgeText, { color: store.store_type === 'SHOP' ? '#c084fc' : colors.primary[400] }]}>
                      {store.store_type}
                    </Text>
                  </BlurView>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{store.name}</Text>
                  <View style={styles.cardSubtitleContainer}>
                    <MapPin size={11} color={colors.text.tertiary} />
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{store.location || 'Online'}</Text>
                  </View>
                  <View style={[styles.cardFooter, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
                    <View style={styles.ratingContainer}>
                      <Star size={10} color={colors.primary[500]} fill={colors.primary[500]} />
                      <Text style={styles.ratingText}>{Number(store.avg_rating || 4.5).toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              </ScalePressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  headerBlock: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  headerTextContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[400],
  },
  locationName: {
    textDecorationLine: 'underline',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[950],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.text.primary,
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.dark[950],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  locationPromptTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationPromptText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  locationPromptBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  locationPromptBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.dark[900],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  horizontalList: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCard: {
    width: '47%',
  },
  card: {
    width: 160,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 4/3,
    backgroundColor: colors.dark[900],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeBottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.text.primary,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 6,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    padding: spacing.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  cardSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.text.tertiary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[400],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
});
