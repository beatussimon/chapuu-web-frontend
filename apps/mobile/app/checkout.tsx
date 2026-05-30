import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { MapPin, Image as ImageIcon, CreditCard, ArrowLeft, Send } from 'lucide-react-native';

import { useUser } from '../context/UserContext';
import apiClient from '../services/api';
import { colors, spacing, borderRadius, typography } from '../theme';
import ScalePressable from '../components/ScalePressable';
import PriceDisplay from '../components/PriceDisplay';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../hooks/useHaptics';

export default function CheckoutScreen() {
  const router = useRouter();
  const { store: storeIdParam } = useLocalSearchParams();
  const storeId = Array.isArray(storeIdParam) ? storeIdParam[0] : storeIdParam;
  
  const { cart, updateCart } = useUser();
  const [store, setStore] = useState<any>(null);
  
  const [fulfillmentMode, setFulfillmentMode] = useState<'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY'>('TAKEAWAY');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryLatitude, setDeliveryLatitude] = useState('');
  const [deliveryLongitude, setDeliveryLongitude] = useState('');
  
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [isInstantPayment, setIsInstantPayment] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const storeCart = cart.filter(item => {
    const itemStore = (item as any).store || item.product?.store || null;
    return itemStore?.id?.toString() === storeId;
  });
  const cartTotal = storeCart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  useEffect(() => {
    if (storeId) {
      apiClient.get(`/stores/${storeId}/`)
        .then(res => {
          setStore(res.data);
          if (res.data.store_type === 'SHOP') {
            setFulfillmentMode('PICKUP');
          }
        })
        .catch(err => console.error(err));
    }
  }, [storeId]);

  const triggerGeolocation = async () => {
    triggerSelectionHaptic();
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setIsLocating(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeliveryLatitude(location.coords.latitude.toString());
      setDeliveryLongitude(location.coords.longitude.toString());

      try {
        const res = await apiClient.get(`/orders/reverse_geocode/?lat=${location.coords.latitude}&lon=${location.coords.longitude}`);
        if (res.data && res.data.display_name) {
          const shortName = res.data.display_name.split(',').slice(0, 3).join(',');
          setDeliveryLocation(shortName);
        } else {
          setDeliveryLocation(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
        }
      } catch (e) {
        setDeliveryLocation(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location');
    }
    setIsLocating(false);
  };

  useEffect(() => {
    if (fulfillmentMode === 'DELIVERY' && !deliveryLocation) {
      triggerGeolocation();
    }
  }, [fulfillmentMode]);

  const pickImage = async () => {
    triggerSelectionHaptic();
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPaymentReceipt(result.assets[0]);
    }
  };

  const handleCheckout = async () => {
    triggerSelectionHaptic();
    if (fulfillmentMode === 'DELIVERY') {
      if (!customerPhone || customerPhone.length < 9 || !deliveryLocation) {
        Alert.alert('Incomplete', 'Please provide a valid phone number and delivery location.');
        return;
      }
    }

    if (!isInstantPayment && !paymentMessage.trim() && !paymentReceipt) {
      Alert.alert('Incomplete', 'Please provide a Transaction ID or Proof of Payment.');
      return;
    }

    setIsCheckingOut(true);

    const payload: any = {
      store: storeId,
      fulfillment_mode: fulfillmentMode,
      payment_message: isInstantPayment ? `Instant Payment (Walk-in)` : paymentMessage,
      is_instant_payment: isInstantPayment,
      items: storeCart.map(i => ({ product: i.product?.id, quantity: i.quantity, unit_price: i.product?.price })),
    };

    if (fulfillmentMode === 'DELIVERY') {
      payload.customer_phone = customerPhone.startsWith('+') ? customerPhone : `+255${customerPhone}`;
      payload.delivery_location = deliveryLocation;
      payload.delivery_latitude = deliveryLatitude;
      payload.delivery_longitude = deliveryLongitude;
    }

    try {
      const res = await apiClient.post('/orders/', payload);
      const orderId = res.data.id;

      if (paymentReceipt) {
        const formData = new FormData();
        const filename = paymentReceipt.uri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('payment_receipt', {
          uri: paymentReceipt.uri,
          name: filename,
          type
        } as any);

        await apiClient.patch(`/orders/${orderId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      triggerSuccessHaptic();
      
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/chapuunotification.mp3') // Assume we have this or fallback gracefully
        );
        await sound.setVolumeAsync(0.25);
        await sound.playAsync();
      } catch (e) {
        console.log('Audio playback failed', e);
      }

      // Clear this store's items from cart
      updateCart(cart.filter(item => {
        const itemStore = (item as any).store || item.product?.store || null;
        return itemStore?.id?.toString() !== storeId;
      }));

      Alert.alert('Success', 'Your order has been placed!', [
        { text: 'View Orders', onPress: () => router.replace('/(tabs)/tab4') }
      ]);
    } catch (e: any) {
      triggerErrorHaptic();
      Alert.alert('Order Failed', e.response?.data?.detail || 'Something went wrong while placing your order.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isShop = store?.store_type === 'SHOP';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ScalePressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </ScalePressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Fulfillment Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fulfillment Mode</Text>
          <View style={styles.modeContainer}>
            {isShop ? (
              <>
                <ModeTab title="Pickup" active={fulfillmentMode === 'PICKUP'} onPress={() => setFulfillmentMode('PICKUP')} />
                <ModeTab title="Delivery" active={fulfillmentMode === 'DELIVERY'} onPress={() => setFulfillmentMode('DELIVERY')} />
              </>
            ) : (
              <>
                <ModeTab title="Dine-in" active={fulfillmentMode === 'DINE_IN'} onPress={() => setFulfillmentMode('DINE_IN')} />
                <ModeTab title="Takeaway" active={fulfillmentMode === 'TAKEAWAY'} onPress={() => setFulfillmentMode('TAKEAWAY')} />
                <ModeTab title="Delivery" active={fulfillmentMode === 'DELIVERY'} onPress={() => setFulfillmentMode('DELIVERY')} />
              </>
            )}
          </View>
        </View>

        {/* Delivery Details */}
        {fulfillmentMode === 'DELIVERY' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Details</Text>
            
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 755123456"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            <Text style={styles.label}>Delivery Address</Text>
            <View style={styles.locationRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="GPS Location"
                placeholderTextColor={colors.text.tertiary}
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
              />
              <ScalePressable onPress={triggerGeolocation} style={styles.gpsBtn}>
                <MapPin size={20} color={colors.dark[950]} />
              </ScalePressable>
            </View>
          </View>
        )}

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Text style={styles.paymentDesc}>
            Please complete your payment to the store's numbers and upload the receipt or enter the transaction ID.
          </Text>

          <View style={styles.instantPaymentRow}>
            <ScalePressable 
              onPress={() => setIsInstantPayment(!isInstantPayment)}
              style={[styles.checkbox, isInstantPayment && styles.checkboxActive]}
            >
              <View />
            </ScalePressable>
            <Text style={styles.checkboxLabel}>I will pay at the store (Cash/Card)</Text>
          </View>

          {!isInstantPayment && (
            <>
              <Text style={styles.label}>Transaction ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5XG89LPO..."
                placeholderTextColor={colors.text.tertiary}
                value={paymentMessage}
                onChangeText={setPaymentMessage}
              />

              <ScalePressable onPress={pickImage} style={styles.uploadBtn}>
                <ImageIcon size={20} color={colors.primary[400]} />
                <Text style={styles.uploadBtnText}>
                  {paymentReceipt ? 'Receipt Selected (Tap to change)' : 'Upload Receipt Screenshot'}
                </Text>
              </ScalePressable>
            </>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {storeCart.map((item, idx) => (
            <View key={idx} style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>{item.quantity}x {item.product?.name}</Text>
              <PriceDisplay amount={(item.product?.price || 0) * item.quantity} style={styles.summaryItemPrice} />
            </View>
          ))}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total to Pay</Text>
            <PriceDisplay amount={cartTotal} style={styles.summaryTotalValue} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <ScalePressable 
          onPress={handleCheckout} 
          disabled={isCheckingOut}
          style={[styles.submitBtn, isCheckingOut && { opacity: 0.7 }]}
        >
          <Text style={styles.submitBtnText}>{isCheckingOut ? 'Processing...' : 'Place Order'}</Text>
          <Send size={20} color={colors.dark[950]} />
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

function ModeTab({ title, active, onPress }: { title: string, active: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={() => {
        triggerSelectionHaptic();
        onPress();
      }} 
      style={[styles.modeTab, active && styles.modeTabActive]}
    >
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{title}</Text>
    </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  modeTabActive: {
    backgroundColor: colors.primary[500],
  },
  modeTabText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: colors.dark[950],
  },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gpsBtn: {
    backgroundColor: colors.primary[500],
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  paymentDesc: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  instantPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  checkboxActive: {
    backgroundColor: colors.primary[500],
  },
  checkboxLabel: {
    color: colors.text.primary,
    fontSize: 14,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    color: colors.primary[400],
    fontWeight: 'bold',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryItemName: {
    color: colors.text.secondary,
  },
  summaryItemPrice: {
    color: colors.text.primary,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  summaryTotalLabel: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    color: colors.primary[400],
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.dark[950],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  submitBtn: {
    backgroundColor: colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  submitBtnText: {
    color: colors.dark[950],
    fontSize: 18,
    fontWeight: 'bold',
  },
});
