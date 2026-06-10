import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, SlidersHorizontal, Store as StoreIcon, Star, Clock, X, Heart } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, typography, borderRadius } from '../theme';
import OptimizedImage from './OptimizedImage';
import LoadingSkeleton from './LoadingSkeleton';
import ScalePressable, { ScaleIconButton } from './ScalePressable';
import FilterModal, { FilterState } from './FilterModal';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { CustomAlert } from './CustomAlert';

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

export default function StoresListScreen() {
  const router = useRouter();
  const { userLocation, savedStores, updateSavedStores, token, theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? '#020617' : '#000000',
    chipBg: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : '#121212',
  };
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Advanced Filters State
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'popular',
    openNow: false,
    minRating: null,
    storeType: 'RESTAURANT'
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchStores = async () => {
    try {
      const params: any = {};
      if (userLocation.granted && userLocation.lat && userLocation.lng) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }
      
      if (filters.storeType !== 'ALL') params.store_type = filters.storeType;
      if (filters.openNow) params.is_open = true;
      if (filters.minRating) params.min_rating = filters.minRating;
      if (filters.sortBy) {
        params.ordering = filters.sortBy === 'distance' ? 'distance' : 
                         filters.sortBy === 'rating' ? '-avg_rating' : 
                         filters.sortBy === 'price_asc' ? 'price' : 
                         filters.sortBy === 'price_desc' ? '-price' : '-popularity';
      }

      if (debouncedQuery.trim() !== '') {
        params.search = debouncedQuery;
      }

      const res = await apiClient.get('/stores/', { params });
      setStores(res.data.results || res.data || []);
    } catch (err) {
      console.warn("Could not fetch stores", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [filters, debouncedQuery, userLocation.granted]);

  const handleRefresh = () => {
    setRefreshing(true);
    triggerLightHaptic();
    fetchStores();
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
    const newSavedStores = isCurrentlySaved 
      ? savedStores.filter(id => id !== storeId)
      : [...savedStores, storeId];
    
    updateSavedStores(newSavedStores);

    try {
      await apiClient.patch('/auth/users/me/', { favorite_stores: newSavedStores });
    } catch (err) {
      updateSavedStores(savedStores);
      CustomAlert.alert("Sync Error", "Could not update favorites.");
    }
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const renderStoreCard = ({ item: store, index }: { item: Store, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
    <ScalePressable style={[styles.storeCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]} onPress={() => handleStorePress(store.id)}>
      <View style={[styles.storeImageContainer, { backgroundColor: activeColors.inputBg }]}>
        {store.image_url ? (
          <OptimizedImage src={store.image_url} style={StyleSheet.absoluteFill} wrapperStyle={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
            <StoreIcon size={32} color={colors.text.tertiary} />
          </View>
        )}

        <ScaleIconButton 
          style={styles.favoriteButton} 
          onPress={() => toggleSavedStore(store.id)}
        >
          <Heart size={18} color={savedStores.includes(store.id) ? colors.error : colors.text.secondary} fill={savedStores.includes(store.id) ? colors.error : 'transparent'} />
        </ScaleIconButton>
        
        {store.distance_km !== undefined && (
          <BlurView intensity={80} tint="dark" style={styles.badgeTopLeft}>
            <MapPin size={10} color={colors.primary[400]} />
            <Text style={styles.badgeText}>{store.distance_km < 0.3 ? 'Nearby' : `${store.distance_km.toFixed(1)} km`}</Text>
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
      <View style={styles.storeCardContent}>
        <Text style={styles.storeTitle} numberOfLines={1}>{store.name}</Text>
        <View style={styles.storeSubtitleContainer}>
          <MapPin size={12} color={colors.text.tertiary} />
          <Text style={styles.storeSubtitle} numberOfLines={1}>{store.location || 'Online'}</Text>
        </View>
        <View style={[styles.storeFooter, { borderTopColor: activeColors.border }]}>
          <View style={styles.ratingContainer}>
            <Star size={12} color={colors.primary[500]} fill={colors.primary[500]} />
            <Text style={styles.ratingText}>{Number(store.avg_rating || 4.5).toFixed(1)}</Text>
            <Text style={styles.ratingDivider}>·</Text>
            <Clock size={12} color={colors.text.tertiary} />
            <Text style={styles.workingHoursText} numberOfLines={1}>
              {store.working_hours ? store.working_hours.split(' - ')[0] : '08:00 AM'}
            </Text>
          </View>
        </View>
      </View>
    </ScalePressable>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {filters.storeType === 'RESTAURANT' ? 'Restaurants' : filters.storeType === 'SHOP' ? 'Shops' : 'Discovery'}
        </Text>
        
        <View style={styles.searchRow}>
          <ScalePressable 
            style={[styles.searchContainer, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
            onPress={() => { triggerLightHaptic(); router.push('/search'); }}
          >
            <Search size={18} color={colors.text.secondary} style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Search {filters.storeType.toLowerCase()}s...</Text>
          </ScalePressable>
          <ScaleIconButton 
            style={[styles.filterButton, !!(filters.sortBy !== 'popular' || filters.openNow || filters.minRating) && styles.filterButtonActive, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} 
            onPress={() => { triggerLightHaptic(); setIsFilterModalVisible(true); }}
          >
            <SlidersHorizontal size={18} color={filters.sortBy !== 'popular' || filters.openNow || filters.minRating ? colors.dark[950] : colors.text.primary} />
          </ScaleIconButton>
        </View>

        <View style={styles.segmentedControl}>
          {(['ALL', 'RESTAURANT', 'SHOP'] as const).map(type => {
            const isActive = filters.storeType === type;
            return (
              <ScalePressable
                key={type}
                style={[
                  styles.segmentButton, 
                  isActive && styles.segmentButtonActive, 
                  { backgroundColor: isActive ? colors.primary[500] : 'transparent' }
                ]}
                onPress={() => { triggerLightHaptic(); setFilters({ ...filters, storeType: type }); }}
              >
                <Text style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]}>
                  {type === 'ALL' ? 'All' : type === 'RESTAURANT' ? 'Restaurants' : 'Shops'}
                </Text>
              </ScalePressable>
            );
          })}
        </View>
      </View>

      <FilterModal 
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />

      {loading && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map(i => <LoadingSkeleton key={i} style={{ width: '100%', height: 220, borderRadius: borderRadius['2xl'], marginBottom: spacing.lg }} />)}
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={item => item.id.toString()}
          renderItem={renderStoreCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary[500]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <StoreIcon size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No {filters.storeType.toLowerCase()}s found.</Text>
            </View>
          }
        />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[900],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.text.tertiary,
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.dark[900],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  segmentedControl: {
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
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    paddingTop: spacing.sm,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.xl,
  },
  storeCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  storeImageContainer: {
    height: 160,
    width: '100%',
    backgroundColor: colors.dark[900],
    position: 'relative',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  badgeBottomLeft: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.primary,
    textTransform: 'uppercase',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    padding: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storeCardContent: {
    padding: spacing.md,
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  storeSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  storeSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  storeFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  ratingDivider: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginHorizontal: 4,
  },
  workingHoursText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});
