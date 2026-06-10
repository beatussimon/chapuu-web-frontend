import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, Modal, Pressable, Dimensions, Linking, Share, LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, ChefHat, Store as StoreIcon, Heart, Phone, Mail, Clock, Star, Plus, Minus, X, UtensilsCrossed, ArrowLeft, Share2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, typography, borderRadius } from '../theme';
import OptimizedImage from './OptimizedImage';
import PriceDisplay from './PriceDisplay';
import LoadingSkeleton from './LoadingSkeleton';
import ScalePressable, { ScaleIconButton } from './ScalePressable';
import { triggerLightHaptic, triggerSelectionHaptic, triggerMediumHaptic } from '../hooks/useHaptics';
import { CustomAlert } from './CustomAlert';

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
  const { cart, updateCart, savedStores, updateSavedStores, theme, token } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? '#020617' : '#000000',
  };

  // Calculate dynamic card width for two-column grid
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = (screenWidth - spacing.md * 3) / 2;
  
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsCount, setReviewsCount] = useState(0);

  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const addToCart = (product: Product, quantity: number) => {
    if (!store) return;
    updateCart([...cart, { id: Math.random().toString(), product: product as any, quantity, store }]);
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
      const params: any = { store: storeId };
      if (searchQuery.trim()) params.search = searchQuery;
      if (activeCategory) params.category = activeCategory;

      const [storeRes, productsRes] = await Promise.all([
        apiClient.get(`/stores/${storeId}/`),
        apiClient.get('/products/', { params })
      ]);
      setStore(storeRes.data);
      const data = productsRes.data?.results || (Array.isArray(productsRes.data) ? productsRes.data : []);
      const unique = Array.from(new Map(data.map((item: Product) => [item.id, item])).values()) as Product[];
      setProducts(unique);
      
      // Pre-fetch reviews to populate reviewsCount immediately
      fetchReviews(1);
    } catch (err) {
      console.warn('[StoreMenu] Failed to fetch:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData();
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, activeCategory]);

  const fetchReviews = async (page = 1) => {
    try {
      setReviewsLoading(true);
      const res = await apiClient.get(`/stores/${storeId}/reviews/?page=${page}`);
      if (res.data) {
        if (page === 1) {
          setReviews(res.data.results || []);
        } else {
          setReviews(prev => [...prev, ...(res.data.results || [])]);
        }
        setReviewsCount(res.data.count || 0);
        setReviewsPage(page); // Sync active page state to fix paging loop!
      }
    } catch (err) {
      console.warn('[StoreMenu] Failed to fetch reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0) {
      fetchReviews(1);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    // 45s polling to keep stock updated
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [storeId]);

  const onRefresh = () => {
    setRefreshing(true);
    router.back();
  };

  const handleToggleSaved = async () => {
    if (!store) return;
    if (!token) {
      CustomAlert.alert("Authentication Required", "Please sign in to save your favorite spots.");
      return;
    }
    triggerSelectionHaptic();
    
    const isSaved = savedStores.includes(store.id);
    const newStores = isSaved
      ? savedStores.filter((s) => s !== store.id)
      : [...savedStores, store.id];

    updateSavedStores(newStores);

    try {
      await apiClient.patch('/auth/users/me/', { favorite_stores: newStores });
    } catch (err) {
      console.warn('[StoreMenu] Favorite sync failed, reverting...', err);
      updateSavedStores(savedStores);
      CustomAlert.alert("Sync Error", "Could not update favorites. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!store) return;
    triggerLightHaptic();
    try {
      const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://chapuu.com';
      const url = `${webUrl}/menu/${store.id}`;
      await Share.share({
        message: `Check out ${store.name} on Chapuu! ${url}`,
        url: url,
        title: store.name,
      });
    } catch (error) {
      console.warn('[StoreMenu] Share error:', error);
    }
  };

  const isSaved = store && savedStores.includes(store.id);
  const isShop = store?.store_type === 'SHOP';

  // Memoized grouping and categories
  const { groupedProducts, categories } = useMemo(() => {
    const grouped = products.reduce((acc: Record<string, Product[]>, product) => {
      const catName = product.category_name || 'Uncategorized';
      if (!acc[catName]) acc[acc[catName] ? catName : catName] = []; // ensure unique
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(product);
      return acc;
    }, {});

    const cats = [...new Set(products.map(p => p.category_name || 'Uncategorized'))];

    return { groupedProducts: grouped, categories: cats };
  }, [products]);

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
          <ScaleIconButton onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text.secondary} />
          </ScaleIconButton>

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

            <ScaleIconButton onPress={handleToggleSaved} style={styles.heartBtn}>
              <Heart size={20} color={isSaved ? colors.error : colors.text.secondary} fill={isSaved ? colors.error : 'transparent'} />
            </ScaleIconButton>
            
            <ScaleIconButton onPress={handleShare} style={[styles.heartBtn, { marginLeft: spacing.sm }]}>
              <Share2 size={20} color={colors.text.secondary} />
            </ScaleIconButton>
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
      {(['menu', 'reviews', 'info'] as const).map(tab => (
        <ScalePressable
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          onPress={() => {
            triggerLightHaptic();
            setActiveTab(tab);
          }}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'menu' ? (isShop ? 'Products' : 'Menu') : tab === 'reviews' ? `Reviews ${reviewsCount > 0 ? `(${reviewsCount})` : ''}` : 'Info & Gallery'}
          </Text>
        </ScalePressable>
      ))}
    </ScrollView>
  );

  const renderProductItem = (p: Product) => {
    const isAvailable = p.computed_is_available !== undefined ? p.computed_is_available : p.is_active;
    const cartItem = cart.find(i => i.product?.id === p.id);

    return (
      <ScalePressable
        key={p.id}
        style={[styles.productCard, !isAvailable && styles.productCardDisabled, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}
        onPress={() => setLightboxProduct(p)}
      >
        <View style={[styles.productImageContainer, { backgroundColor: activeColors.inputBg }]}>
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
                <ScalePressable onPress={() => { triggerMediumHaptic(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); updateQuantity(p.id, cartItem.quantity - 1); }} style={styles.qtyBtn}>
                  <Minus size={14} color={colors.text.secondary} />
                </ScalePressable>
                <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                <ScalePressable onPress={() => { triggerMediumHaptic(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); updateQuantity(p.id, cartItem.quantity + 1); }} style={styles.qtyBtn}>
                  <Plus size={14} color={colors.text.secondary} />
                </ScalePressable>
              </View>
            ) : (
              <ScalePressable
                onPress={() => {
                  triggerMediumHaptic();
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  addToCart(p, 1);
                }}
                style={styles.addBtn}
              >
                <Plus size={16} color={colors.text.primary} />
              </ScalePressable>
            )}
          </View>
        </View>
      </ScalePressable>
    );
  };

  const renderMenuContent = () => (
    <View style={styles.menuContent}>
      <View style={[styles.searchWrapper, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
        <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${isShop ? 'products' : 'menu'}...`}
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <ScaleIconButton onPress={() => setSearchQuery('')} style={{ padding: spacing.xs }}>
            <X size={18} color={colors.text.tertiary} />
          </ScaleIconButton>
        )}
      </View>

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
          <ScalePressable
            style={[styles.chip, !activeCategory && styles.chipActive, { backgroundColor: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : '#121212', borderColor: activeColors.border }]}
            onPress={() => { setActiveCategory(null); }}
          >
            <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>All</Text>
          </ScalePressable>
          {categories.map(cat => (
            <ScalePressable
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive, { backgroundColor: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : '#121212', borderColor: activeColors.border }]}
              onPress={() => { triggerLightHaptic(); setActiveCategory(cat); }}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </ScalePressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <LoadingSkeleton style={{ height: 200, width: '100%', borderRadius: borderRadius.xl }} />
      ) : products.length === 0 ? (
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
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
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
          <View style={styles.tabSectionContent}>
            {reviewsLoading && reviews.length === 0 ? (
              <LoadingSkeleton style={{ height: 200, width: '100%', borderRadius: borderRadius.xl }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Star size={48} color={colors.border} />
                <Text style={styles.emptyText}>No reviews yet.</Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                <View style={styles.reviewsSummary}>
                  <Text style={styles.reviewsAvg}>{store?.avg_rating?.toFixed(1) || '0.0'}</Text>
                  <View style={styles.reviewsStars}>
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={16} color={i <= (store?.avg_rating || 0) ? colors.primary[500] : colors.border} fill={i <= (store?.avg_rating || 0) ? colors.primary[500] : 'transparent'} />
                    ))}
                  </View>
                  <Text style={styles.reviewsCountText}>Based on {reviewsCount} reviews</Text>
                </View>
                {reviews.map((rev, idx) => (
                  <View key={idx} style={[styles.reviewCard, { backgroundColor: activeColors.card }]}>
                    <View style={styles.reviewHeaderRow}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{rev.customer_name?.charAt(0) || 'A'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewName}>{rev.customer_name || 'Anonymous'}</Text>
                        <Text style={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                      </View>
                      <View style={styles.reviewStarBadge}>
                        <Star size={12} color={colors.primary[500]} fill={colors.primary[500]} />
                        <Text style={styles.reviewStarText}>{rev.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                  </View>
                ))}
                {reviews.length < reviewsCount && (
                  <ScalePressable onPress={() => fetchReviews(reviewsPage + 1)} style={styles.loadMoreBtn}>
                    <Text style={styles.loadMoreText}>{reviewsLoading ? 'Loading...' : 'Load More'}</Text>
                  </ScalePressable>
                )}
              </View>
            )}
          </View>
        )}
        {activeTab === 'info' && (
          <View style={styles.tabSectionContent}>
            
            <View style={[styles.infoCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <View style={styles.infoCardHeader}>
                <Clock size={16} color={colors.primary[500]} />
                <Text style={styles.infoCardTitle}>Operational Hours</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Working Hours</Text>
                <Text style={styles.infoValue}>{store?.working_hours || '08:00 AM - 10:00 PM'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.badge, store?.is_open ? styles.badgeOpen : styles.badgeClosed]}>
                  <View style={[styles.dot, store?.is_open ? styles.dotOpen : styles.dotClosed]} />
                  <Text style={[styles.badgeText, store?.is_open ? styles.textOpen : styles.textClosed]}>
                    {store?.is_open ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <View style={styles.infoCardHeader}>
                <MapPin size={16} color={colors.primary[500]} />
                <Text style={styles.infoCardTitle}>Contact & Location</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>{store?.location || 'Online / Delivery Only'}</Text>
              </View>
              {store?.contact_phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <ScalePressable onPress={() => Linking.openURL(`tel:${store.contact_phone}`)}>
                    <Text style={styles.infoLink}>{store.contact_phone}</Text>
                  </ScalePressable>
                </View>
              )}
              {store?.contact_email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <ScalePressable onPress={() => Linking.openURL(`mailto:${store.contact_email}`)}>
                    <Text style={styles.infoLink}>{store.contact_email}</Text>
                  </ScalePressable>
                </View>
              )}
            </View>

            <Text style={styles.gallerySectionTitle}>Gallery</Text>

            {!store?.gallery_images || store.gallery_images.length === 0 ? (
              <View style={styles.emptyState}>
                <MapPin size={48} color={colors.border} />
                <Text style={styles.emptyText}>No gallery images available.</Text>
              </View>
            ) : (
              <View style={styles.galleryGrid}>
                {store.gallery_images.map((imgObj: any, idx) => {
                  const imgSrc = typeof imgObj === 'string' ? imgObj : (imgObj?.image || imgObj?.image_url || imgObj?.url || '');
                  return (
                  <ScalePressable 
                    key={idx} 
                    style={styles.galleryThumbWrapper}
                    onPress={() => {
                      triggerSelectionHaptic();
                      setGalleryLightboxIndex(idx);
                      setIsGalleryOpen(true);
                    }}
                  >
                    <OptimizedImage src={imgSrc} wrapperStyle={styles.galleryThumb} />
                  </ScalePressable>
                )})}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal visible={!!lightboxProduct} transparent animationType="fade" onRequestClose={() => setLightboxProduct(null)}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScaleIconButton style={styles.closeModalBtn} onPress={() => setLightboxProduct(null)}>
              <X size={24} color={colors.text.primary} />
            </ScaleIconButton>
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

      {/* Gallery Lightbox */}
      <Modal visible={isGalleryOpen} transparent animationType="fade" onRequestClose={() => setIsGalleryOpen(false)}>
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill}>
          <SafeAreaView style={{ flex: 1 }}>
            
            <View style={styles.lightboxHeader}>
              <Text style={styles.lightboxIndexText}>
                {galleryLightboxIndex + 1} of {store?.gallery_images?.length || 0}
              </Text>
              <ScaleIconButton style={styles.lightboxCloseBtn} onPress={() => setIsGalleryOpen(false)}>
                <X size={24} color={colors.text.primary} />
              </ScaleIconButton>
            </View>
            
            {store?.gallery_images && store.gallery_images.length > 0 && (
              <View style={{ flex: 1 }}>
                <ScrollView 
                  horizontal 
                  pagingEnabled 
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                    if (newIndex !== galleryLightboxIndex) {
                      triggerSelectionHaptic();
                      setGalleryLightboxIndex(newIndex);
                    }
                  }}
                  contentOffset={{ x: galleryLightboxIndex * screenWidth, y: 0 }}
                  style={{ flex: 1 }}
                >
                  {store.gallery_images.map((imgObj: any, idx) => {
                    const imgSrc = typeof imgObj === 'string' ? imgObj : (imgObj?.image || imgObj?.image_url || imgObj?.url || '');
                    return (
                      <View key={idx} style={{ width: screenWidth, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <OptimizedImage src={imgSrc} wrapperStyle={{ width: '90%', height: '75%' }} style={{ resizeMode: 'contain' }} />
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.lightboxFooter}>
                  {(() => {
                    const imgObj = store.gallery_images[galleryLightboxIndex];
                    const caption = typeof imgObj === 'object' && (imgObj as any)?.caption ? (imgObj as any).caption : '';
                    if (caption) {
                      return <Text style={styles.lightboxCaption}>{caption}</Text>;
                    }
                    return (
                      <>
                        <Text style={styles.lightboxCaptionEmpty}>No description available</Text>
                        <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Swipe Left or Right to Browse</Text>
                      </>
                    );
                  })()}
                </View>
              </View>
            )}
          </SafeAreaView>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    marginTop: spacing.md,
    fontSize: 16,
  },
  tabSectionContent: {
    padding: spacing.xl,
  },
  reviewsList: {
    gap: spacing.lg,
  },
  reviewsSummary: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  reviewsAvg: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text.primary,
  },
  reviewsStars: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: spacing.xs,
  },
  reviewsCountText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: colors.primary[400],
    fontWeight: 'bold',
    fontSize: 18,
  },
  reviewName: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewDate: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  reviewStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  reviewStarText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  reviewComment: {
    color: colors.text.secondary,
    lineHeight: 20,
  },
  loadMoreBtn: {
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
  },
  loadMoreText: {
    color: colors.primary[400],
    fontWeight: 'bold',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryThumbWrapper: {
    width: '31%',
    aspectRatio: 1,
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  galleryNavBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'column',
    gap: spacing.md,
  },
  productCard: {
    width: '100%',
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
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: spacing.md,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  infoLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[400],
    textDecorationLine: 'underline',
  },
  gallerySectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  lightboxIndexText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  lightboxCloseBtn: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  lightboxFooter: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  lightboxCaption: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lightboxCaptionEmpty: {
    color: colors.text.secondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

