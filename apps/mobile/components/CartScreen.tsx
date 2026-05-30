import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, Store as StoreIcon, Trash2, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useUser } from '../context/UserContext';
import { colors, spacing, borderRadius } from '../theme';
import OptimizedImage from './OptimizedImage';
import PriceDisplay from './PriceDisplay';
import ScalePressable from './ScalePressable';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { CartItem } from '../types';

export default function CartScreen() {
  const router = useRouter();
  const { cart, updateCart, updateUser } = useUser();

  const groupedCart = useMemo(() => {
    return cart.reduce((acc: Record<string, { store: any, items: CartItem[], total: number }>, item) => {
      // In the web app, the store object is attached to the item or accessible.
      // We assume item.store exists based on GlobalCart.jsx.
      const store = (item as any).store || item.product?.store || null;
      const storeId = store?.id || 'unknown';
      if (!acc[storeId]) {
        acc[storeId] = {
          store: store,
          items: [],
          total: 0
        };
      }
      acc[storeId].items.push(item);
      acc[storeId].total += (item.product?.price || 0) * item.quantity;
      return acc;
    }, {});
  }, [cart]);

  const removeFromCart = (productId: number) => {
    triggerLightHaptic();
    updateCart(cart.filter(item => item.product?.id !== productId));
  };

  const handleCheckoutStore = (store: any) => {
    if (!store) return;
    triggerSelectionHaptic();
    // Assuming checkout reads the selected store ID from router params
    router.push(`/checkout?store=${store.id}`);
  };

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Global Cart</Text>
          <Text style={styles.headerSubtitle}>Review your unpurchased items</Text>
        </View>
        <View style={styles.emptyState}>
          <ShoppingCart size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyDesc}>Looks like you haven't added anything yet.</Text>
          <ScalePressable onPress={() => { triggerSelectionHaptic(); router.replace('/'); }} style={styles.browseBtn}>
            <Text style={styles.browseBtnText}>Browse Stores</Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Cart</Text>
        <Text style={styles.headerSubtitle}>Review your unpurchased items</Text>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {Object.values(groupedCart).map((group, idx) => {
          const store = group.store;
          const hasStore = !!store;

          return (
            <View key={store?.id || `unknown-${idx}`} style={styles.storeCard}>
              {store?.image_url && (
                <View style={[StyleSheet.absoluteFill, styles.storeImageBg]}>
                  <OptimizedImage src={store.image_url} wrapperStyle={StyleSheet.absoluteFill} style={StyleSheet.absoluteFill} />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2, 6, 23, 0.95)' }]} />
                </View>
              )}

              <View style={styles.storeHeader}>
                {store?.image_url ? (
                  <OptimizedImage src={store.image_url} wrapperStyle={styles.storeLogo} />
                ) : (
                  <View style={styles.storeLogoPlaceholder}>
                    <StoreIcon size={20} color={colors.text.secondary} />
                  </View>
                )}
                <View style={styles.storeHeaderText}>
                  <Text style={styles.storeName}>{hasStore ? store.name : 'Unknown Store'}</Text>
                  <Text style={styles.storeItemsCount}>{group.items.length} item{group.items.length > 1 ? 's' : ''}</Text>
                </View>
              </View>

              <View style={styles.itemsList}>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.itemLeft}>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>{item.quantity}x</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product?.name}</Text>
                        <PriceDisplay amount={item.product?.price || 0} style={styles.itemPriceEach} />
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <PriceDisplay amount={(item.product?.price || 0) * item.quantity} style={styles.itemTotal} />
                      <TouchableOpacity onPress={() => removeFromCart(item.product?.id || 0)} style={styles.trashBtn}>
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.checkoutFooter}>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Store Subtotal:</Text>
                  <PriceDisplay amount={group.total} style={styles.subtotalValue} />
                </View>
                <ScalePressable
                  disabled={!hasStore}
                  onPress={() => handleCheckoutStore(store)}
                  style={[styles.checkoutBtn, !hasStore && styles.checkoutBtnDisabled]}
                >
                  <Text style={styles.checkoutBtnText}>Checkout this Store</Text>
                  <ArrowRight size={18} color={colors.dark[950]} />
                </ScalePressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  storeCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  storeImageBg: {
    opacity: 0.1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xl,
  },
  storeLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeaderText: {
    marginLeft: spacing.md,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  storeItemsCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  itemsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: spacing.sm,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  qtyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  qtyBadgeText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemPriceEach: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTotal: {
    color: colors.primary[400],
    fontSize: 16,
    fontWeight: 'bold',
  },
  trashBtn: {
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
  },
  checkoutFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: spacing.md,
  },
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subtotalLabel: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  subtotalValue: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutBtnText: {
    color: colors.dark[950],
    fontSize: 16,
    fontWeight: 'bold',
  },
});
