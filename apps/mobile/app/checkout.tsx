import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, ShoppingCart } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, spacing, borderRadius } from '../theme';
import { useUser } from '../context/UserContext';
import apiClient from '../services/api';
import { normalizeStoreId, normalizeStoreName } from '../utils/cartNormalizer';
import { triggerLightHaptic } from '../hooks/useHaptics';
import PriceDisplay from '../components/PriceDisplay';
import { CustomAlert } from '../components/CustomAlert';
import ScalePressable, { ScaleIconButton } from '../components/ScalePressable';

// Refactored Components & Hooks
import { OrderMethodSelector } from '../components/checkout/OrderMethodSelector';
import { DeliveryLocationPicker } from '../components/checkout/DeliveryLocationPicker';
import { PaymentMethodSelector } from '../components/checkout/PaymentMethodSelector';
import { useCheckoutSubmit } from '../hooks/useCheckoutSubmit';

export default function CheckoutScreen() {
  const router = useRouter();
  const { store } = useLocalSearchParams();
  const storeIdParam = typeof store === 'string' ? store : (Array.isArray(store) ? store[0] : null);

  const { cart, activeReservation, setActiveReservation, userLocation, userRole, theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : '#000000',
  };
  const [storeCart, setStoreCart] = useState(cart);
  const [storeConfig, setStoreConfig] = useState<any>(null);

  // Form State
  const [orderMethod, setOrderMethod] = useState<'DELIVERY' | 'PICKUP' | 'DINE_IN'>('DELIVERY');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [isInstantPayment, setIsInstantPayment] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  
  const [deliveryLocation, setDeliveryLocation] = useState(userLocation?.name || '');
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(userLocation?.lat || null);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(userLocation?.lng || null);
  const [deliveryDirections, setDeliveryDirections] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const triggerGeolocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        CustomAlert.alert('Permission Denied', 'Permission to access location was denied. Please enter your address manually.');
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      const roundedLat = parseFloat(latitude.toFixed(6));
      const roundedLng = parseFloat(longitude.toFixed(6));
      
      setDeliveryLatitude(roundedLat);
      setDeliveryLongitude(roundedLng);

      try {
        const res = await apiClient.get('/orders/reverse_geocode/', {
          params: { lat: roundedLat, lon: roundedLng }
        });
        
        if (res.data && res.data.display_name) {
          const shortName = res.data.display_name.split(',').slice(0, 3).join(',');
          setDeliveryLocation(shortName);
        } else {
          setDeliveryLocation(`${roundedLat}, ${roundedLng}`);
        }
      } catch (err) {
        setDeliveryLocation(`${roundedLat}, ${roundedLng}`);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (orderMethod === 'DELIVERY' && !deliveryLocation.trim()) {
      triggerGeolocation();
    }
  }, [orderMethod]);
  
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState('');

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(new Date(Date.now() + 30 * 60000));
  const [prepTimeOption, setPrepTimeOption] = useState<'DYNAMIC' | 'CUSTOM'>('DYNAMIC');
  const [scheduledStartTime, setScheduledStartTime] = useState(new Date(Date.now() + 15 * 60000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  const { handleCheckout, isSubmitting } = useCheckoutSubmit();

  useEffect(() => {
    // Filter cart for the specific store using the robust normalizer
    if (storeIdParam) {
      const filtered = cart.filter(item => normalizeStoreId(item.store) === storeIdParam);
      setStoreCart(filtered);
      // Fetch full store config to get payment methods dynamically
      apiClient.get(`/stores/${storeIdParam}/`).then(res => setStoreConfig(res.data)).catch(console.error);
      apiClient.get(`/stores/${storeIdParam}/tables/`).then(res => setTables(Array.isArray(res.data) ? res.data : [])).catch(console.error);
    } else {
      setStoreCart(cart);
    }
  }, [cart, storeIdParam]);

  useEffect(() => {
    // Auto-fetch phone number
    apiClient.get('/auth/users/me/')
      .then(res => {
        if (res.data && res.data.phone_number) {
          // Extract just the digits, ensuring it's not prefixed wrongly for the UI
          const rawPhone = res.data.phone_number.replace(/\D/g, '');
          // If it starts with 255, we might want to strip it if the UI assumes local, but our UI max length is 9
          // The web `parseLocalPhoneNumber` does exactly this, let's just grab the last 9 digits.
          const localPhone = rawPhone.length >= 9 ? rawPhone.slice(-9) : rawPhone;
          setPhoneNumber(localPhone);
        }
      })
      .catch(console.error);
  }, []);

  // Handle auto-switch fulfillment mode if instant payment selected
  useEffect(() => {
    if (isInstantPayment && orderMethod === 'DELIVERY') {
      const isShop = storeConfig?.store_type === 'SHOP';
      setOrderMethod(isShop ? 'PICKUP' : 'TAKEAWAY' as any);
    }
  }, [isInstantPayment, orderMethod, storeConfig]);

  // Derived calculations
  const subtotal = storeCart.reduce((sum, item) => sum + (parseFloat(String(item.product?.price || '0')) * item.quantity), 0);
  const deliveryFee = orderMethod === 'DELIVERY' ? 100 : 0;
  const total = subtotal + deliveryFee;

  const getStoreName = () => {
    if (storeCart.length > 0 && storeCart[0].store) {
      return normalizeStoreName(storeCart[0].store);
    }
    return 'Store';
  };

  const onSubmit = () => {
    if (!storeIdParam) {
      CustomAlert.alert("Error", "Store ID is missing.");
      return;
    }

    handleCheckout({
      cart: storeCart,
      storeId: storeIdParam,
      orderMethod,
      paymentMessage,
      isInstantPayment,
      receiptUri,
      deliveryLocation,
      deliveryLatitude,
      deliveryLongitude,
      deliveryDirections,
      phoneNumber,
      isScheduled,
      scheduledTime,
      prepTimeOption,
      scheduledStartTime,
      activeReservation,
      setActiveReservation,
      selectedTable,
      storeConfig
    });
  };

  if (storeCart.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
          <ScaleIconButton onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </ScaleIconButton>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyCartState}>
          <View style={styles.emptyCartIcon}>
            <ShoppingCart size={48} color={colors.primary[500]} />
          </View>
          <Text style={styles.emptyCartTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyCartDesc}>Add items from a store to proceed to checkout.</Text>
          <ScalePressable style={styles.emptyCartBtn} onPress={() => router.replace('/')}>
            <Text style={styles.emptyCartBtnText}>Browse Stores</Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
          <ScaleIconButton onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </ScaleIconButton>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView 
          bottomOffset={20}
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.orderSummary}>
            <Text style={styles.storeName}>Ordering from {getStoreName()}</Text>
            <Text style={styles.itemCount}>{storeCart.length} items</Text>
          </View>

          <OrderMethodSelector 
            selectedMethod={orderMethod} 
            onMethodSelect={setOrderMethod} 
            activeReservation={activeReservation} 
          />

          {orderMethod === 'DELIVERY' && (
            <DeliveryLocationPicker
              initialLocation={deliveryLocation}
              initialPhone={phoneNumber}
              initialLat={deliveryLatitude}
              initialLng={deliveryLongitude}
              initialDirections={deliveryDirections}
              onLocationChange={(loc, lat, lng) => {
                setDeliveryLocation(loc);
                setDeliveryLatitude(lat);
                setDeliveryLongitude(lng);
              }}
              onPhoneChange={setPhoneNumber}
              onDirectionsChange={setDeliveryDirections}
              isLocating={isLocating}
              onGetLocation={triggerGeolocation}
            />
          )}

          {orderMethod === 'DINE_IN' && !activeReservation && (
            <View style={[styles.tableSelectorContainer, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <Text style={styles.sectionTitle}>Table Selection</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>
                  {storeConfig?.requires_table_for_dine_in !== false ? "Select Table" : "Select Table (Optional)"}
                </Text>
                <View style={styles.tableGrid}>
                  {storeConfig?.requires_table_for_dine_in === false && (
                    <ScalePressable 
                      style={[styles.tableBtn, selectedTable === '' && styles.tableBtnActive, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                      onPress={() => setSelectedTable('')}
                    >
                      <Text style={[styles.tableBtnText, selectedTable === '' && styles.tableBtnTextActive]}>
                        Any / Free Seating
                      </Text>
                    </ScalePressable>
                  )}
                  {tables.map(t => (
                    <ScalePressable
                      key={t.id}
                      style={[styles.tableBtn, selectedTable === String(t.id) && styles.tableBtnActive, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                      onPress={() => setSelectedTable(String(t.id))}
                    >
                      <Text style={[styles.tableBtnText, selectedTable === String(t.id) && styles.tableBtnTextActive]}>
                        Table {t.number} ({t.capacity})
                      </Text>
                    </ScalePressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={[styles.scheduleContainer, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleTitleRow}>
                <Clock size={20} color={colors.text.primary} />
                <Text style={styles.sectionTitle}>Schedule Order</Text>
              </View>
              <Switch
                value={isScheduled}
                onValueChange={(val) => {
                  triggerLightHaptic();
                  setIsScheduled(val);
                }}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary[500] }}
                thumbColor="#fff"
              />
            </View>
            
            {isScheduled && (
              <View style={[styles.timeSelectorGroup, { borderTopColor: activeColors.border }]}>
                <Text style={styles.inputLabel}>Target Delivery/Pickup Time</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <ScalePressable style={[styles.timeBtn, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.timeBtnLabel}>Date</Text>
                    <Text style={styles.timeBtnValue}>{scheduledTime.toLocaleDateString()}</Text>
                  </ScalePressable>
                  <ScalePressable style={[styles.timeBtn, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.timeBtnLabel}>Time</Text>
                    <Text style={styles.timeBtnValue}>
                      {scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </ScalePressable>
                </View>

                <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Preparation Strategy</Text>
                <View style={styles.prepStrategyRow}>
                  <ScalePressable 
                    style={[styles.prepStrategyBtn, prepTimeOption === 'DYNAMIC' && styles.prepStrategyBtnActive, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                    onPress={() => setPrepTimeOption('DYNAMIC')}
                  >
                    <Text style={[styles.prepStrategyText, prepTimeOption === 'DYNAMIC' && styles.prepStrategyTextActive]}>Dynamic</Text>
                  </ScalePressable>
                  <ScalePressable 
                    style={[styles.prepStrategyBtn, prepTimeOption === 'CUSTOM' && styles.prepStrategyBtnActive, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                    onPress={() => setPrepTimeOption('CUSTOM')}
                  >
                    <Text style={[styles.prepStrategyText, prepTimeOption === 'CUSTOM' && styles.prepStrategyTextActive]}>Custom Start</Text>
                  </ScalePressable>
                </View>

                {prepTimeOption === 'CUSTOM' && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={styles.inputLabel}>Start Prep Time</Text>
                    <ScalePressable style={[styles.timeBtn, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} onPress={() => setShowStartTimePicker(true)}>
                      <Text style={styles.timeBtnValue}>
                        {scheduledStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </ScalePressable>
                  </View>
                )}

                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledTime}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && date) setScheduledTime(date);
                    }}
                    textColor={colors.text.primary}
                  />
                )}
                
                {showTimePicker && (
                  <DateTimePicker
                    value={scheduledTime}
                    mode="time"
                    onChange={(event, date) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && date) setScheduledTime(date);
                    }}
                    textColor={colors.text.primary}
                  />
                )}

                {showStartTimePicker && (
                  <DateTimePicker
                    value={scheduledStartTime}
                    mode="time"
                    onChange={(event, date) => {
                      setShowStartTimePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && date) setScheduledStartTime(date);
                    }}
                    textColor={colors.text.primary}
                  />
                )}
              </View>
            )}
          </View>

          <PaymentMethodSelector 
            paymentMethods={storeConfig?.payment_methods || []}
            paymentMessage={paymentMessage}
            onPaymentMessageChange={setPaymentMessage}
            isInstantPayment={isInstantPayment}
            onInstantPaymentChange={setIsInstantPayment}
            userRole={userRole || 'CUSTOMER'}
            receiptUri={receiptUri}
            onReceiptChange={setReceiptUri}
            total={total}
          />
          
          <View style={styles.bottomPadding} />
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { backgroundColor: activeColors.card, borderTopColor: activeColors.border }]}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <PriceDisplay amount={subtotal.toString()} style={styles.totalsValue} />
          </View>
          {orderMethod === 'DELIVERY' && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Delivery Fee</Text>
              <PriceDisplay amount={deliveryFee.toString()} style={styles.totalsValue} />
            </View>
          )}
          <View style={[styles.totalsRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <PriceDisplay amount={total.toString()} style={styles.grandTotalValue} />
          </View>

          <ScalePressable 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm Order</Text>
            )}
          </ScalePressable>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.md,
  },
  orderSummary: {
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  storeName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary[400],
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  scheduleContainer: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  timeSelectorGroup: {
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeBtnLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeBtnValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tableSelectorContainer: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  pickerContainer: {
    marginTop: spacing.sm,
  },
  pickerLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tableBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tableBtnActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: colors.primary[500],
  },
  tableBtnText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  tableBtnTextActive: {
    color: colors.primary[400],
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  prepStrategyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prepStrategyBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  prepStrategyBtnActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: colors.primary[500],
  },
  prepStrategyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  prepStrategyTextActive: {
    color: colors.primary[400],
  },
  bottomPadding: {
    height: 40,
  },
  footer: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalsLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  totalsValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  grandTotalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.lg,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary[400],
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.dark[950],
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyCartState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCartIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyCartTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyCartDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyCartBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyCartBtnText: {
    color: colors.dark[950],
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
