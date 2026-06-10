import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, MapPin, Star, Clock, ArrowLeft, Store as StoreIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, borderRadius } from '../theme';
import OptimizedImage from '../components/OptimizedImage';
import ScalePressable, { ScaleIconButton } from '../components/ScalePressable';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { CustomAlert } from '../components/CustomAlert';
import { SkeletonFavoriteList } from '../components/SkeletonCards';

interface Store {
  id: number;
  name: string;
  store_type: 'RESTAURANT' | 'SHOP';
  location: string;
  image_url: string | null;
  avg_rating: number;
  working_hours: string;
  is_open: boolean;
  distance_km?: number;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { savedStores, updateSavedStores, userLocation, token, theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
  };
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const params: any = {};
      if (userLocation.granted && userLocation.lat && userLocation.lng) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }
      
      // Hit the dedicated favorites endpoint for active favorited stores
      const res = await apiClient.get('/auth/users/me/favorites/', { params });
      const data = res.data?.results || res.data || [];
      setStores(data);
      
      // Keep local IDs in sync
      const ids = data.map((s: any) => s.id);
      updateSavedStores(ids);
    } catch (err) {
      console.warn("[Favorites] Failed to fetch:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFavorites();
    } else {
      setStores([]);
      setLoading(false);
    }
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    triggerLightHaptic();
    fetchFavorites();
  };

  const handleStorePress = (storeId: number) => {
    triggerLightHaptic();
    router.push(`/(tabs)/tab2?store=${storeId}`);
  };

  const toggleSavedStore = async (storeId: number) => {
    triggerSelectionHaptic();
    const isCurrentlySaved = savedStores.includes(storeId);
    
    // Optimistic UI update
    const newSavedStores = isCurrentlySaved 
      ? savedStores.filter(id => id !== storeId)
      : [...savedStores, storeId];
    
    updateSavedStores(newSavedStores);
    
    // Filter local stores list immediately
    if (isCurrentlySaved) {
      setStores(prev => prev.filter(s => s.id !== storeId));
    }

    try {
      if (isCurrentlySaved) {
        await apiClient.delete(`/auth/users/me/favorites/?store_id=${storeId}`);
      } else {
        await apiClient.post('/auth/users/me/favorites/', { store_id: storeId });
        fetchFavorites(); // Refresh to get full store object
      }
    } catch (err) {
      updateSavedStores(savedStores);
      CustomAlert.alert("Sync Error", "Could not update favorites.");
    }
  };

  const renderStoreCard = ({ item: store, index }: { item: Store, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
    <ScalePressable style={[styles.storeCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]} onPress={() => handleStorePress(store.id)}>
      <View style={styles.storeImageContainer}>
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
          <Heart size={18} color={colors.error} fill={colors.error} />
        </ScaleIconButton>

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
            <Text style={styles.workingHoursText}>
              {store.working_hours ? store.working_hours.split(' - ')[0] : '08:00 AM'}
            </Text>
          </View>
          {store.distance_km !== undefined && (
            <Text style={styles.distanceText}>{store.distance_km.toFixed(1)} km</Text>
          )}
        </View>
      </View>
    </ScalePressable>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <ScalePressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text.secondary} />
        </ScalePressable>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      {!token ? (
        <View style={styles.emptyState}>
          <Heart size={64} color="rgba(239, 68, 68, 0.2)" />
          <Text style={styles.emptyTitle}>Sign In to Save Favorites</Text>
          <Text style={styles.emptyDesc}>Create an account or sign in to save your favorite spots and view them here!</Text>
          <ScalePressable style={styles.browseBtn} onPress={() => router.push('/login')}>
            <Text style={styles.browseBtnText}>Sign In</Text>
          </ScalePressable>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.listContent}>
          <SkeletonFavoriteList count={4} />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyState}>
          <Heart size={64} color="rgba(239, 68, 68, 0.2)" />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyDesc}>Start saving your favorite restaurants and shops to find them quickly here!</Text>
          <ScalePressable style={styles.browseBtn} onPress={() => router.push('/')}>
            <Text style={styles.browseBtnText}>Explore Spots</Text>
          </ScalePressable>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={item => item.id.toString()}
          renderItem={renderStoreCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
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
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    padding: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedTag: {
    backgroundColor: colors.error,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[400],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  browseBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  browseBtnText: {
    color: colors.dark[950],
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
