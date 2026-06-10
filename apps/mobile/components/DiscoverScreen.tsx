import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, Platform, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import ScalePressable, { ScaleIconButton } from './ScalePressable';
import { CustomAlert } from './CustomAlert';
import FilterModal, { FilterState } from './FilterModal';
import MapModal from './MapModal';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';

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
  const { token, userLocation, requestLocationPermission, savedStores, updateSavedStores, theme } = useUser();
  const isAuthenticated = !!token;

  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    headerBg: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    inputBg: theme === 'legacy' ? '#020617' : '#000000',
  };

  // Calculate dynamic card width for two-column grid
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = (screenWidth - spacing.md * 3) / 2;
  
  const [metrics, setMetrics] = useState<StatMetrics | null>(null);
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);

  // Advanced Filters State
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'popular',
    openNow: false,
    minRating: null,
    storeType: 'ALL'
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      const params: any = {};
      if (userLocation.granted && userLocation.lat && userLocation.lng) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }
      
      // Map filters to API parameters
      if (filters.storeType !== 'ALL') params.store_type = filters.storeType;
      if (filters.openNow) params.is_open = true;
      if (filters.minRating) params.min_rating = filters.minRating;
      if (filters.sortBy) params.ordering = filters.sortBy === 'distance' ? 'distance' : filters.sortBy === 'rating' ? '-avg_rating' : filters.sortBy === 'price_asc' ? 'price' : filters.sortBy === 'price_desc' ? '-price' : '-popularity';

      if (debouncedQuery.trim() !== '') {
        params.search = debouncedQuery;
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
  }, [userLocation.granted, userLocation.lat, userLocation.lng, filters, debouncedQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    triggerLightHaptic();
    loadData();
  };

  const handleStorePress = (storeId: number) => {
    triggerLightHaptic();
    router.push(`/(tabs)/tab2?store=${storeId}`);
  };

  const toggleSavedStore = async (storeId: number) => {
    if (!token) {
      CustomAlert.alert("Authentication Required", "Please sign in to save your favorite spots.");
      return;
    }
    
    triggerSelectionHaptic();
    const isCurrentlySaved = savedStores.includes(storeId);
    
    // Optimistic UI update
    const newSavedStores = isCurrentlySaved 
      ? savedStores.filter(id => id !== storeId)
      : [...savedStores, storeId];
    
    updateSavedStores(newSavedStores);

    try {
      await apiClient.patch('/auth/users/me/', { favorite_stores: newSavedStores });
    } catch (err) {
      console.warn('[Discover] Favorite sync failed, reverting...', err);
      // Revert on failure
      updateSavedStores(savedStores);
      CustomAlert.alert("Sync Error", "Could not update favorites. Please try again.");
    }
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleSelectStoreFromMap = (store: any) => {
    handleStorePress(store.id);
  };

  const renderHeader = () => (
    <View style={[styles.headerBlock, { backgroundColor: activeColors.headerBg, borderColor: activeColors.border }]}>
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
        <ScalePressable 
          style={[styles.searchInputWrapper, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} 
          onPress={() => { router.push('/search'); }}
        >
          <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder} numberOfLines={1} ellipsizeMode="tail">Search meals, spots, categories...</Text>
        </ScalePressable>
        <ScaleIconButton 
          style={[styles.filterButton, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} 
          onPress={() => { triggerSelectionHaptic(); setIsMapVisible(true); }}
        >
          <MapPin size={18} color={colors.primary[400]} />
        </ScaleIconButton>
        <ScaleIconButton 
          style={[styles.filterButton, !!(filters.sortBy !== 'popular' || filters.openNow || filters.minRating) && styles.filterButtonActive, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} 
          onPress={() => { setIsFilterModalVisible(true); }}
        >
          <SlidersHorizontal size={18} color={filters.sortBy !== 'popular' || filters.openNow || filters.minRating ? colors.dark[950] : colors.text.secondary} />
        </ScaleIconButton>
      </View>
      
      <View style={[styles.segmentedControl, { marginTop: spacing.md }]}>
        {(['ALL', 'RESTAURANT', 'SHOP'] as const).map((type) => {
          const isActive = filters.storeType === type;
          return (
            <ScalePressable 
              key={type} 
              style={[
                styles.segmentButton, 
                isActive && styles.segmentButtonActive,
                { backgroundColor: isActive ? colors.primary[500] : 'transparent' }
              ]}
              onPress={() => { triggerSelectionHaptic(); setFilters({ ...filters, storeType: type }); }}
            >
              <Text style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]}>
                {type === 'ALL' ? 'All' : type === 'RESTAURANT' ? 'Restaurants' : 'Shops'}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      {metrics && (
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
            <Text style={styles.metricVal}>{metrics.total_stores}</Text>
            <Text style={styles.metricLabel}>Partners Near You</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
            <Text style={styles.metricVal}>{metrics.total_meals_served}+</Text>
            <Text style={styles.metricLabel}>Meals Served</Text>
          </View>
        </View>
      )}

      {!userLocation.granted && (
        <View style={styles.locationPrompt}>
          <View style={styles.locationPromptTextContainer}>
            <MapPin size={12} color={colors.primary[400]} />
            <Text style={styles.locationPromptText}>Enable location to get nearby spots!</Text>
          </View>
          <ScalePressable style={styles.locationPromptBtn} onPress={requestLocationPermission}>
            <Text style={styles.locationPromptBtnText}>Turn On</Text>
          </ScalePressable>
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
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
        {renderSkeletons()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
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

        <FilterModal 
          isVisible={isFilterModalVisible}
          onClose={() => setIsFilterModalVisible(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />

        <MapModal
          isOpen={isMapVisible}
          onClose={() => setIsMapVisible(false)}
          userLocation={userLocation}
          stores={stores}
          onSelectStore={handleSelectStoreFromMap}
        />

        {/* Trending Section */}
        {trendingItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <TrendingUp size={18} color={colors.primary[500]} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
              <ScalePressable onPress={() => router.push('/(tabs)/tab2')}>
                <Text style={styles.viewAllText}>View All</Text>
              </ScalePressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {trendingItems.slice(0, 4).map((item, index) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(index * 100).springify()}>
                <ScalePressable onPress={() => handleStorePress(item.store_id)} style={[styles.card, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                  <View style={styles.cardImageContainer}>
                    <OptimizedImage
                      src={item.image_url || ''}
                      placeholderType="product"
                      wrapperStyle={styles.cardImage}
                    />
                    {item.distance_km !== undefined && (
                      <BlurView intensity={80} tint="dark" style={styles.badgeTopLeft}>
                        <MapPin size={9} color={colors.primary[400]} />
                        <Text style={styles.badgeText}>{item.distance_km < 0.3 ? 'Nearby' : `${item.distance_km} km`}</Text>
                      </BlurView>
                    )}
                    <BlurView intensity={80} tint="dark" style={[styles.badgeBottomLeft, { flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                      <TrendingUp size={9} color={colors.warning} />
                      <Text style={[styles.badgeText, { color: colors.warning }]}>TRENDING</Text>
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
                      <Text style={styles.trendingCountText}>{item.times_ordered} orders</Text>
                    </View>
                  </View>
                </ScalePressable>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Directory Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <StoreIcon size={20} color={colors.primary[500]} />
              <Text style={styles.sectionTitle}>
                {userLocation.granted ? "Closest spots to you" : "Discover spots"}
              </Text>
            </View>
          </View>
          <View style={styles.grid}>
            {stores.map((store, index) => (
              <Animated.View key={`store-${store.id}`} entering={FadeInDown.delay(index * 100).springify()} style={{ width: '100%' }}>
              <ScalePressable onPress={() => handleStorePress(store.id)} style={[styles.card, styles.gridCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                <ScaleIconButton
                  style={styles.favoriteButton}
                  onPress={() => toggleSavedStore(store.id)}
                >
                  <Heart size={16} color={savedStores.includes(store.id) ? colors.error : colors.text.secondary} fill={savedStores.includes(store.id) ? colors.error : 'transparent'} />
                </ScaleIconButton>
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
                      <Text style={styles.badgeText}>{store.distance_km < 0.3 ? 'Nearby' : `${store.distance_km} km`}</Text>
                    </BlurView>
                  )}
                  <BlurView intensity={80} tint="dark" style={styles.badgeBottomLeft}>
                    <Text style={[styles.badgeText, { color: store.store_type === 'SHOP' ? '#c084fc' : colors.primary[400] }]}>
                      {store.store_type}
                    </Text>
                  </BlurView>
                  {!store.is_open && (
                    <View style={styles.closedOverlay}>
                      <Text style={styles.closedTag}>Closed</Text>
                    </View>
                  )}
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
                      <Text style={styles.ratingDivider}>·</Text>
                      <Clock size={10} color={colors.text.tertiary} />
                      <Text style={styles.workingHoursText} numberOfLines={1}>
                        {store.working_hours ? store.working_hours.split(' - ')[0] : '08:00 AM'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScalePressable>
              </Animated.View>
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
    height: 48,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.text.tertiary,
    fontSize: 14,
  },
  searchIcon: {
    marginRight: spacing.sm,
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
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[400],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  horizontalList: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  grid: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  gridCard: {
    width: '100%',
    height: 'auto',
  },
  card: {
    width: 160,
    height: 230,
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
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary[500],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentButtonText: {
    color: colors.text.secondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  segmentButtonTextActive: {
    color: colors.dark[950],
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
  },
  mapToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  filterChipTextActive: {
    color: colors.dark[950],
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  closedTag: {
    backgroundColor: colors.error,
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    letterSpacing: 1.5,
    transform: [{ rotate: '-6deg' }],
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trendingCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.secondary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  ratingDivider: {
    color: '#334155', // slate-700
    fontWeight: '900',
    marginHorizontal: 2,
  },
  workingHoursText: {
    fontSize: 10,
    color: colors.text.secondary,
    marginLeft: 2,
    maxWidth: 60,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary[400],
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categorySelectorRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  categorySegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categorySegmentText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  floatingMapButtonContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  floatingMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingMapButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
});
