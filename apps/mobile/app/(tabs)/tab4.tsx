import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ShoppingBag, Calendar, ArrowRight, Star } from 'lucide-react-native';

import { useUser } from '../../context/UserContext';
import apiClient from '../../services/api';
import { Order, Reservation } from '../../types';
import { colors, spacing, borderRadius } from '../../theme';
import ScalePressable from '../../components/ScalePressable';
import PriceDisplay from '../../components/PriceDisplay';
import { triggerLightHaptic, triggerSelectionHaptic } from '../../hooks/useHaptics';
import { SkeletonOrderList } from '../../components/SkeletonCards';

export default function Tab4Screen() {
  const router = useRouter();
  const { userRole, pendingDeepLinkPath, setPendingDeepLinkPath, theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
  };
  
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'RESERVATIONS'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Consume deep links pointing to an order
  useEffect(() => {
    if (pendingDeepLinkPath && pendingDeepLinkPath.startsWith('/order')) {
      const match = pendingDeepLinkPath.match(/\/order\/(track\/)?(\d+)/);
      if (match && match[2]) {
        router.push(`/order/${match[2]}` as any);
      }
      setPendingDeepLinkPath(null);
    }
  }, [pendingDeepLinkPath, router, setPendingDeepLinkPath]);

  const fetchData = async (isRefresh = false) => {
    if (userRole !== 'CUSTOMER') return;
    if (isRefresh) setRefreshing(true);
    
    try {
      if (activeTab === 'ORDERS') {
        const res = await apiClient.get('/orders/');
        setOrders(res.data.results || res.data || []);
      } else {
        const res = await apiClient.get('/reservations/');
        setReservations(res.data.results || res.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      
      // Setup lightweight polling while screen is focused
      const interval = setInterval(() => {
        fetchData();
      }, 30000);
      
      return () => clearInterval(interval);
    }, [activeTab, userRole])
  );

  const handleTabSwitch = (tab: 'ORDERS' | 'RESERVATIONS') => {
    triggerSelectionHaptic();
    setActiveTab(tab);
    setLoading(true);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(activeTab === 'ORDERS' ? '0%' : '100%', { damping: 20, stiffness: 200 }) as any }]
    };
  }, [activeTab]);

  // Staff Fallback
  if (userRole !== 'CUSTOMER') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]}>
        <View style={styles.staffFallback}>
          <Text style={styles.emptyTitle}>Staff Area</Text>
          <Text style={styles.emptyDesc}>Use the Dashboard or TV mode to view incoming orders.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderOrder = ({ item, index }: { item: Order, index: number }) => {
    const isCancelled = ['CANCELLED', 'REFUNDED', 'EXPIRED'].includes(item.state);
    const isCompleted = item.state === 'COMPLETED';
    const isActive = !isCancelled && !isCompleted;
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <ScalePressable 
        style={[styles.card, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
        onPress={() => {
          triggerLightHaptic();
          router.push(`/order/${item.id}` as any);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <View style={[
            styles.statePill,
            isCancelled && styles.statePillError,
            isCompleted && styles.statePillSuccess,
            isActive && styles.statePillActive
          ]}>
            <Text style={[
              styles.stateText,
              isCancelled && styles.stateTextError,
              isCompleted && styles.stateTextSuccess,
              isActive && styles.stateTextActive
            ]}>
              {item.state.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        
        <Text style={styles.storeName}>{item.store_name || `Store #${item.store}`}</Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        <View style={styles.tagsRow}>
          <View style={styles.modeTag}>
            <Text style={styles.modeText}>{item.fulfillment_mode.replace(/_/g, ' ')}</Text>
          </View>
          {item.has_review && (
            <View style={styles.reviewTag}>
              <Star size={10} color={colors.primary[500]} fill={colors.primary[500]} />
              <Text style={styles.reviewText}>Reviewed</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <PriceDisplay amount={item.total_amount} style={styles.totalPrice} />
          <View style={styles.trackBtn}>
            <Text style={styles.trackBtnText}>{isActive ? 'Track' : 'View'}</Text>
            <ArrowRight size={14} color={colors.primary[500]} />
          </View>
        </View>
      </ScalePressable>
      </Animated.View>
    );
  };

  const renderReservation = ({ item, index }: { item: Reservation, index: number }) => {
    const isCancelled = ['CANCELLED', 'NO_SHOW'].includes(item.status);
    const isCompleted = item.status === 'COMPLETED';
    const isActive = !isCancelled && !isCompleted;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={[styles.card, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Booking #{item.id}</Text>
          <View style={[
            styles.statePill,
            isCancelled && styles.statePillError,
            isCompleted && styles.statePillSuccess,
            isActive && styles.statePillActive
          ]}>
            <Text style={[
              styles.stateText,
              isCancelled && styles.stateTextError,
              isCompleted && styles.stateTextSuccess,
              isActive && styles.stateTextActive
            ]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.storeName}>{item.store_name || `Store #${item.store || 'Unknown'}`}</Text>
        <Text style={styles.dateText}>
          {new Date(item.reservation_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        <View style={styles.resDetailsRow}>
          <Text style={styles.resDetailText}>Guests: <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>{item.guest_count}</Text></Text>
          <Text style={styles.resDetailText}>Duration: <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>{item.duration_minutes}m</Text></Text>
          {item.table_number && (
            <View style={styles.tableTag}>
              <Text style={styles.tableText}>Table {item.table_number}</Text>
            </View>
          )}
        </View>

        {item.linked_order && (
          <ScalePressable 
            style={styles.linkedOrderCard}
            onPress={() => {
              triggerLightHaptic();
              router.push(`/order/${item.linked_order?.id}` as any);
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.linkedTitle}>Pre-ordered Meal</Text>
              <ArrowRight size={14} color={colors.text.secondary} />
            </View>
            <PriceDisplay amount={item.linked_order.total_amount} style={styles.totalPrice} />
          </ScalePressable>
        )}
      </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <ShoppingBag size={24} color={colors.primary[500]} />
            <Text style={styles.headerTitle}>My Activity</Text>
          </View>
          <Text style={styles.headerSubtitle}>Orders & Reservations history.</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <Animated.View style={[{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: '50%',
          backgroundColor: colors.primary[500],
          borderRadius: borderRadius.lg,
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }, indicatorStyle]} />
        <ScalePressable 
          style={styles.tabBtn} 
          onPress={() => handleTabSwitch('ORDERS')}
        >
          <ShoppingBag size={14} color={activeTab === 'ORDERS' ? colors.dark[950] : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'ORDERS' && styles.tabTextActive]}>Orders</Text>
        </ScalePressable>
        <ScalePressable 
          style={styles.tabBtn} 
          onPress={() => handleTabSwitch('RESERVATIONS')}
        >
          <Calendar size={14} color={activeTab === 'RESERVATIONS' ? colors.dark[950] : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'RESERVATIONS' && styles.tabTextActive]}>Reservations</Text>
        </ScalePressable>
      </View>

      {loading && !refreshing ? (
        <SkeletonOrderList count={3} />
      ) : activeTab === 'ORDERS' ? (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary[500]} />}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <ShoppingBag size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyDesc}>Discover great food nearby!</Text>
              <ScalePressable style={styles.browseBtn} onPress={() => { triggerSelectionHaptic(); router.push('/'); }}>
                <Text style={styles.browseBtnText}>Browse Restaurants</Text>
              </ScalePressable>
            </View>
          }
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReservation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary[500]} />}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <Calendar size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No reservations</Text>
              <Text style={styles.emptyDesc}>Book a table for dine-in!</Text>
              <ScalePressable style={styles.browseBtn} onPress={() => { triggerSelectionHaptic(); router.push('/reserve' as any); }}>
                <Text style={styles.browseBtnText}>Reserve a Table</Text>
              </ScalePressable>
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
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    zIndex: 1,
    elevation: 1,
  },
  tabBtnActive: {
    backgroundColor: colors.primary[500],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.dark[950],
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statePillActive: { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
  statePillSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  statePillError: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  stateText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  stateTextActive: { color: '#818cf8' },
  stateTextSuccess: { color: '#4ade80' },
  stateTextError: { color: '#f87171' },
  storeName: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeText: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  reviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: spacing.md,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[400],
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  browseBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  browseBtnText: {
    color: colors.dark[950],
    fontSize: 14,
    fontWeight: 'bold',
  },
  staffFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resDetailText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  tableTag: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tableText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary[400],
  },
  linkedOrderCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  linkedTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
