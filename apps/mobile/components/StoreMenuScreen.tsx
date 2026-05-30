import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, ChefHat, Store as StoreIcon, Heart, Phone, Mail, Clock, Star, Plus, Minus, X, UtensilsCrossed, ArrowLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, typography, borderRadius } from '../theme';
import OptimizedImage from './OptimizedImage';
import PriceDisplay from './PriceDisplay';
import LoadingSkeleton from './LoadingSkeleton';
import ScalePressable from './ScalePressable';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';

interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  image_url: string | null;
  category_name?: string;
  is_active: boolean;
  computed_is_available?: boolean;
  requires_inventory: boolean;
  stock_quantity: number | null;
}

interface Store {
  id: number;
  name: string;
  store_type: 'RESTAURANT' | 'SHOP';
  location: string;
  image_url: string | null;
  avg_rating: number;
  working_hours: string;
  is_open: boolean;
  contact_phone?: string;
  phone?: string;
  contact_email?: string;
  gallery_images?: string[];
}

interface StoreMenuScreenProps {
  storeId: string;
}

export default function StoreMenuScreen({ storeId }: StoreMenuScreenProps) {
  const router = useRouter();
  const { cart, updateCart, savedStores, updateSavedStores } = useUser();
  
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const toggleSaveStore = (id: number) => {
    if (savedStores.includes(id)) {
      updateSavedStores(savedStores.filter(s => s !== id));
    } else {
      updateSavedStores([...savedStores, id]);
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    updateCart([...cart, { id: Math.random().toString(), product: product as any, quantity }]);
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      updateCart(cart.filter(item => item.product?.id !== id));
    } else {
      updateCart(cart.map(item => item.product?.id === id ? { ...item, quantity } : item));
    }
  };

  const fetchData = async () => {
    try {
      const [storeRes, productsRes] = await Promise.all([
        apiClient.get(`/stores/${storeId}/`),
        apiClient.get(`/products/?store=${storeId}`)
      ]);
      setStore(storeRes.data);
      const data = productsRes.data?.results || (Array.isArray(productsRes.data) ? productsRes.data : []);
      const unique = Array.from(new Map(data.map((item: Product) => [item.id, item])).values()) as Product[];
      setProducts(unique);
    } catch (err) {
      console.warn('[StoreMenu] Failed to fetch:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 45s polling to keep stock updated
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [storeId]);

  const onRefresh = () => {
    setRefreshing(true);
    triggerLightHaptic();
    fetchData();
  };

  const handleToggleSaved = () => {
    if (!store) return;
    triggerSelectionHaptic();
    toggleSaveStore(store.id);
  };

  const isSaved = store && savedStores.includes(store.id);
  const isShop = store?.store_type === 'SHOP';

  // Memoized filters
  const { filteredProducts, groupedProducts, categories } = useMemo(() => {
    const filtered = products.filter(p => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || (p.category_name || 'Uncategorized') === activeCategory;
      return matchesSearch && matchesCategory;
    });

    const grouped = filtered.reduce((acc: Record<string, Product[]>, product) => {
      const catName = product.category_name || 'Uncategorized';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(product);
      return acc;
    }, {});

    const cats = [...new Set(products.map(p => p.category_name || 'Uncategorized'))];

    return { filteredProducts: filtered, groupedProducts: grouped, categories: cats };
  }, [products, searchQuery, activeCategory]);

  const renderHeader = () => {
    if (!store) return null;
    return (
      <View style={styles.headerBlock}>
        {store.image_url && (
          <View style={StyleSheet.absoluteFill}>
            <OptimizedImage src={store.image_url} wrapperStyle={StyleSheet.absoluteFill} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2, 6, 23, 0.75)' }]} />
          </View>
        )}
        
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.storeInfoRow}>
            {store.image_url && (
              <OptimizedImage src={store.image_url} wrapperStyle={styles.storeLogo} placeholderType="store" />
            )}
            <View style={styles.storeDetails}>
              <View style={styles.storeTitleRow}>
                {isShop ? <StoreIcon size={20} color="#a855f7" /> : <ChefHat size={20} color={colors.primary[500]} />}
                <Text style={styles.storeTitle} numberOfLines={1}>{store.name}</Text>
              </View>

              <View style={styles.badgesRow}>
                <View style={[styles.badge, store.is_open ? styles.badgeOpen : styles.badgeClosed]}>
                  <View style={[styles.dot, store.is_open ? styles.dotOpen : styles.dotClosed]} />
                  <Text style={[styles.badgeText, store.is_open ? styles.textOpen : styles.textClosed]}>
                    {store.is_open ? 'Open Now' : 'Closed'}
                  </Text>
                </View>

                <View style={styles.badgeNeutral}>
                  <Clock size={10} color={colors.text.secondary} />
                  <Text style={styles.textNeutral}>{store.working_hours || '08:00 AM - 10:00 PM'}</Text>
                </View>

                {store.location && (
                  <View style={styles.badgeNeutral}>
                    <MapPin size={10} color={colors.text.secondary} />
                    <Text style={styles.textNeutral}>{store.location}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsRow}>
                {store.contact_phone && (
                  <View style={styles.actionLink}>
                    <Phone size={12} color={colors.primary[400]} />
                    <Text style={styles.actionTextPrimary}>Call</Text>
                  </View>
                )}
                {store.contact_email && (
                  <View style={styles.actionLink}>
                    <Mail size={12} color={colors.text.secondary} />
                    <Text style={styles.actionTextSecondary}>Email</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={handleToggleSaved} style={styles.heartBtn}>
              <Heart size={20} color={isSaved ? colors.error : colors.text.secondary} fill={isSaved ? colors.error : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
      {(['menu', 'reviews', 'info'] as const).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          onPress={() => {
            triggerLightHaptic();
            setActiveTab(tab);
          }}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'menu' ? (isShop ? 'Products' : 'Menu') : tab === 'reviews' ? 'Reviews' : 'Info & Gallery'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderProductItem = (p: Product) => {
    const isAvailable = p.computed_is_available !== undefined ? p.computed_is_available : p.is_active;
    const cartItem = cart.find(i => i.product?.id === p.id);

    return (
      <ScalePressable
        key={p.id}
        style={[styles.productCard, !isAvailable && styles.productCardDisabled]}
        onPress={() => setLightboxProduct(p)}
      >
        <View style={styles.productImageContainer}>
          {p.image_url ? (
            <OptimizedImage src={p.image_url} wrapperStyle={styles.productImage} placeholderType="product" />
          ) : (
            <View style={[styles.productImage, { alignItems: 'center', justifyContent: 'center' }]}>
              <UtensilsCrossed size={48} color={colors.border} />
            </View>
          )}
          {!isAvailable && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.productContent}>
          <Text style={styles.productTitle} numberOfLines={1}>{p.name}</Text>
          {p.requires_inventory && p.stock_quantity !== null && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>{p.stock_quantity} in stock</Text>
            </View>
          )}
          <Text style={styles.productDesc} numberOfLines={2}>{p.description}</Text>

          <View style={styles.productFooter}>
            <PriceDisplay amount={p.price} style={styles.productPrice} />

            {!isAvailable ? (
              <Text style={styles.unavailableText}>Unavailable</Text>
            ) : cartItem ? (
              <View style={styles.cartControl}>
                <TouchableOpacity onPress={() => { triggerLightHaptic(); updateQuantity(p.id, cartItem.quantity - 1); }} style={styles.qtyBtn}>
                  <Minus size={14} color={colors.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                <TouchableOpacity onPress={() => { triggerLightHaptic(); updateQuantity(p.id, cartItem.quantity + 1); }} style={styles.qtyBtn}>
                  <Plus size={14} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  triggerSelectionHaptic();
                  addToCart(p, 1);
                }}
                style={styles.addBtn}
              >
                <Plus size={16} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScalePressable>
    );
  };

  const renderMenuContent = () => (
    <View style={styles.menuContent}>
      <View style={styles.searchWrapper}>
        <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${isShop ? 'products' : 'menu'}...`}
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: spacing.xs }}>
            <X size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
          <TouchableOpacity
            style={[styles.chip, !activeCategory && styles.chipActive]}
            onPress={() => { triggerLightHaptic(); setActiveCategory(null); }}
          >
            <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive]}
              onPress={() => { triggerLightHaptic(); setActiveCategory(cat); }}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <LoadingSkeleton style={{ height: 200, width: '100%', borderRadius: borderRadius.xl }} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <UtensilsCrossed size={48} color={colors.border} />
          <Text style={styles.emptyText}>{searchQuery ? `No results for "${searchQuery}"` : 'No products available.'}</Text>
        </View>
      ) : (
        <View style={styles.categorySections}>
          {Object.entries(groupedProducts).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIndicator} />
                <Text style={styles.categoryTitle}>{category}</Text>
                <Text style={styles.categoryCount}>({items.length})</Text>
              </View>
              <View style={styles.grid}>
                {items.map(renderProductItem)}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
        {renderTabs()}

        {activeTab === 'menu' && renderMenuContent()}
        {activeTab === 'reviews' && (
          <View style={styles.emptyState}>
            <Star size={48} color={colors.border} />
            <Text style={styles.emptyText}>Reviews coming soon.</Text>
          </View>
        )}
        {activeTab === 'info' && (
          <View style={styles.emptyState}>
            <MapPin size={48} color={colors.border} />
            <Text style={styles.emptyText}>Info & Gallery coming soon.</Text>
          </View>
        )}
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal visible={!!lightboxProduct} transparent animationType="fade" onRequestClose={() => setLightboxProduct(null)}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setLightboxProduct(null)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.lightboxContent}>
              {lightboxProduct?.image_url && (
                <OptimizedImage src={lightboxProduct.image_url} wrapperStyle={styles.lightboxImage} />
              )}
              <Text style={styles.lightboxTitle}>{lightboxProduct?.name}</Text>
              <Text style={styles.lightboxDesc}>{lightboxProduct?.description}</Text>
              <PriceDisplay amount={lightboxProduct?.price || 0} style={styles.lightboxPrice} />
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  headerBlock: {
    backgroundColor: colors.surfaceHighlight,
    borderBottomLeftRadius: borderRadius['3xl'],
    borderBottomRightRadius: borderRadius['3xl'],
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  headerContent: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text.primary,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOpen: { backgroundColor: colors.success },
  dotClosed: { backgroundColor: colors.error },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  textOpen: { color: colors.success },
  textClosed: { color: colors.error },
  badgeNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  textNeutral: { fontSize: 10, fontWeight: '700', color: colors.text.secondary },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionTextPrimary: { fontSize: 10, fontWeight: '700', color: colors.primary[400] },
  actionTextSecondary: { fontSize: 10, fontWeight: '700', color: colors.text.secondary },
  heartBtn: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xl,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary[400],
    fontWeight: '900',
  },
  menuContent: {
    paddingHorizontal: spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.text.primary,
  },
  categoryChips: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    backgroundColor: colors.primary[500],
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.dark[950],
    fontWeight: '700',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  categorySections: {
    gap: spacing.xl,
  },
  categorySection: {
    gap: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryIndicator: {
    width: 4,
    height: 24,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productCard: {
    width: '47%',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 4/3,
    backgroundColor: colors.dark[900],
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    backgroundColor: colors.error,
    color: colors.text.primary,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    fontSize: 12,
    transform: [{ rotate: '-12deg' }],
  },
  productContent: {
    padding: spacing.md,
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  stockBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderColor: 'rgba(251, 146, 60, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.warning,
  },
  productDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    flex: 1,
    marginBottom: spacing.md,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[400],
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.error,
  },
  cartControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    width: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  addBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 6,
    borderRadius: borderRadius.md,
  },
  closeModalBtn: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  lightboxContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  lightboxImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.lg,
  },
  lightboxTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lightboxDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  lightboxPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary[400],
  },
});
