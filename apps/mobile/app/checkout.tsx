import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { MapPin, Image as ImageIcon, CreditCard, ArrowLeft, Send, Store, Clock, Utensils, ShoppingBag, ShoppingCart, Plus } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  
  const { cart, updateCart, userRole, activeReservation, setActiveReservation } = useUser();
  const [store, setStore] = useState<any>(null);
  
  const [fulfillmentMode, setFulfillmentMode] = useState<'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY'>('TAKEAWAY');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryLatitude, setDeliveryLatitude] = useState('');
  const [deliveryLongitude, setDeliveryLongitude] = useState('');
  const [deliveryDirections, setDeliveryDirections] = useState('');
  
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState('');

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date>(new Date(Date.now() + 3600000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [prepTimeOption, setPrepTimeOption] = useState<'DYNAMIC'|'CUSTOM'>('DYNAMIC');
  const [scheduledStartTime, setScheduledStartTime] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [isInstantPayment, setIsInstantPayment] = useState(false);
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
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
          if (res.data.store_type === 'SHOP') setFulfillmentMode('PICKUP');
        })
        .catch(err => console.error(err));
        
      apiClient.get(`/stores/${storeId}/tables/`)
        .then(res => setTables(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Could not fetch tables', err));
        
      apiClient.get(`/products/recommendations/?store=${storeId}`)
        .then(res => setRecommendations(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Could not fetch recommendations', err));
        
      apiClient.get('/auth/users/me/')
        .then(res => {
          if (res.data?.phone_number) {
            setCustomerPhone(res.data.phone_number.replace('+255', ''));
          }
        }).catch(() => {});
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
    if (fulfillmentMode === 'DELIVERY' && !deliveryLocation) triggerGeolocation();
  }, [fulfillmentMode]);

  const pickImage = async () => {
    triggerSelectionHaptic();
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPaymentReceipt(result.assets[0]);
  };
  
  const addToCart = (product: any) => {
    triggerSelectionHaptic();
    const existingIndex = cart.findIndex(item => item.product?.id === product.id);
    let newCart = [...cart];
    if (existingIndex >= 0) {
      newCart[existingIndex].quantity += 1;
    } else {
      newCart.push({ id: Date.now().toString(), product, quantity: 1, custom_instructions: '' } as any);
    }
    updateCart(newCart);
  };

  const handleCheckout = async () => {
    triggerSelectionHaptic();
    
    if (fulfillmentMode === 'DINE_IN' && !selectedTable) {
      if (store?.requires_table_for_dine_in !== false) {
        Alert.alert('Missing Info', 'Please select a table.');
        return;
      }
    }
    
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

    if (isScheduled) {
      if (scheduledTime <= new Date()) {
        Alert.alert('Invalid Time', 'Scheduled time must be in the future.');
        return;
      }
      if (prepTimeOption === 'CUSTOM' && scheduledStartTime <= new Date()) {
        Alert.alert('Invalid Time', 'Preparation start time must be in the future.');
        return;
      }
    }

    setIsCheckingOut(true);

    const isReservationOrder = !!activeReservation;
    const finalMode = isReservationOrder ? 'RESERVATION' : fulfillmentMode;

    const payload: any = {
      store: storeId,
      fulfillment_mode: finalMode,
      payment_message: isInstantPayment ? 'Instant Payment (Walk-in)' : paymentMessage,
      is_instant_payment: isInstantPayment,
      items: storeCart.map(i => ({ product: i.product?.id, quantity: i.quantity, unit_price: i.product?.price })),
    };

    if (activeReservation) payload.reservation = activeReservation;
    if (finalMode === 'DINE_IN' && selectedTable) payload.table = selectedTable;
    
    if (finalMode === 'DELIVERY') {
      payload.customer_phone = customerPhone.startsWith('+') ? customerPhone : `+255${customerPhone}`;
      payload.delivery_location = deliveryLocation;
      payload.delivery_latitude = deliveryLatitude;
      payload.delivery_longitude = deliveryLongitude;
      if (deliveryDirections) payload.delivery_directions = deliveryDirections;
    }
    
    if (isScheduled) {
      payload.scheduled_time = scheduledTime.toISOString();
      payload.prep_time_option = prepTimeOption;
      if (prepTimeOption === 'CUSTOM') payload.scheduled_start_time = scheduledStartTime.toISOString();
    }

    try {
      const res = await apiClient.post('/orders/', payload);
      const orderId = res.data.id;

      if (paymentReceipt) {
        const formData = new FormData();
        const filename = paymentReceipt.uri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('payment_receipt', { uri: paymentReceipt.uri, name: filename, type } as any);
        await apiClient.patch(`/orders/${orderId}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      triggerSuccessHaptic();
      
      updateCart(cart.filter(item => {
        const itemStore = (item as any).store || item.product?.store || null;
        return itemStore?.id?.toString() !== storeId;
      }));
      setActiveReservation(null);

      router.replace(`/order/confirmation/${orderId}` as any);
    } catch (e: any) {
      triggerErrorHaptic();
      Alert.alert('Checkout Failed', e.response?.data?.detail || 'Something went wrong while placing your order.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isShop = store?.store_type === 'SHOP';
  const isStaff = ['SELLER', 'ADMIN', 'SUPERUSER', 'ACCOUNTANT', 'CHEF'].includes(userRole || '');

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
        {/* Order Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Store size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Order Options</Text>
          </View>

          {isStaff && (
            <View style={styles.staffAlert}>
              <ScalePressable 
                onPress={() => setIsInstantPayment(!isInstantPayment)}
                style={[styles.checkbox, isInstantPayment && styles.checkboxActive]}
              >
                <View />
              </ScalePressable>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.staffAlertTitle}>Walk-In / Pay on Spot</Text>
                <Text style={styles.staffAlertDesc}>Customer is physically present and paying now.</Text>
              </View>
            </View>
          )}

          {activeReservation ? (
            <View style={styles.reservationAlert}>
              <View style={styles.resIconBox}><Utensils size={20} color={colors.dark[950]} /></View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.resAlertTitle}>Reservation Pre-order</Text>
                <Text style={styles.resAlertDesc}>Linked to reservation #{activeReservation}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.modeContainer}>
              {isShop ? (
                <>
                  <ModeTab title="Pickup" icon={<ShoppingBag size={16} color={fulfillmentMode === 'PICKUP' ? colors.dark[950] : colors.text.secondary} />} active={fulfillmentMode === 'PICKUP'} onPress={() => setFulfillmentMode('PICKUP')} />
                  <ModeTab title="Delivery" icon={<MapPin size={16} color={fulfillmentMode === 'DELIVERY' ? colors.dark[950] : colors.text.secondary} />} active={fulfillmentMode === 'DELIVERY'} onPress={() => setFulfillmentMode('DELIVERY')} />
                </>
              ) : (
                <>
                  <ModeTab title="Takeaway" icon={<ShoppingCart size={16} color={fulfillmentMode === 'TAKEAWAY' ? colors.dark[950] : colors.text.secondary} />} active={fulfillmentMode === 'TAKEAWAY'} onPress={() => setFulfillmentMode('TAKEAWAY')} />
                  <ModeTab title="Dine-in" icon={<Utensils size={16} color={fulfillmentMode === 'DINE_IN' ? colors.dark[950] : colors.text.secondary} />} active={fulfillmentMode === 'DINE_IN'} onPress={() => setFulfillmentMode('DINE_IN')} />
                  <ModeTab title="Delivery" icon={<MapPin size={16} color={fulfillmentMode === 'DELIVERY' ? colors.dark[950] : colors.text.secondary} />} active={fulfillmentMode === 'DELIVERY'} onPress={() => setFulfillmentMode('DELIVERY')} />
                </>
              )}
            </View>
          )}

          {/* Scheduling */}
          {!activeReservation && (
            <View style={styles.scheduleContainer}>
              <ScalePressable style={styles.scheduleToggle} onPress={() => setIsScheduled(!isScheduled)}>
                <View style={[styles.checkbox, isScheduled && styles.checkboxActive]} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.scheduleTitle}><Clock size={14} color={colors.primary[500]} /> Schedule Order for Later</Text>
                  <Text style={styles.scheduleDesc}>Place order now and receive it at your preferred time.</Text>
                </View>
              </ScalePressable>

              {isScheduled && (
                <View style={styles.scheduleOptions}>
                  <Text style={styles.label}>Target Delivery/Pickup Time</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                      <Text style={styles.datePickerText}>{scheduledTime.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.datePickerText}>{scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledTime}
                      mode="date"
                      onChange={(event, date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (date) setScheduledTime(date);
                      }}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={scheduledTime}
                      mode="time"
                      onChange={(event, date) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (date) setScheduledTime(date);
                      }}
                    />
                  )}

                  <Text style={styles.label}>Preparation Strategy</Text>
                  <View style={styles.modeContainer}>
                    <TouchableOpacity style={[styles.strategyBtn, prepTimeOption === 'DYNAMIC' && styles.strategyBtnActive]} onPress={() => setPrepTimeOption('DYNAMIC')}>
                      <Text style={[styles.strategyText, prepTimeOption === 'DYNAMIC' && styles.strategyTextActive]}>Dynamic (Auto)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.strategyBtn, prepTimeOption === 'CUSTOM' && styles.strategyBtnActive]} onPress={() => setPrepTimeOption('CUSTOM')}>
                      <Text style={[styles.strategyText, prepTimeOption === 'CUSTOM' && styles.strategyTextActive]}>Custom Start</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.scheduleDesc}>
                    {prepTimeOption === 'DYNAMIC' ? "System calculates when to start prep." : "Explicitly choose when kitchen starts."}
                  </Text>
                  
                  {prepTimeOption === 'CUSTOM' && (
                    <View style={{ marginTop: spacing.md }}>
                       <Text style={styles.label}>Start Prep Time</Text>
                       <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
                          <Text style={styles.datePickerText}>{scheduledStartTime.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartTimePicker(true)}>
                          <Text style={styles.datePickerText}>{scheduledStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {showStartPicker && (
                        <DateTimePicker
                          value={scheduledStartTime}
                          mode="date"
                          onChange={(event, date) => {
                            setShowStartPicker(Platform.OS === 'ios');
                            if (date) setScheduledStartTime(date);
                          }}
                        />
                      )}
                      {showStartTimePicker && (
                        <DateTimePicker
                          value={scheduledStartTime}
                          mode="time"
                          onChange={(event, date) => {
                            setShowStartTimePicker(Platform.OS === 'ios');
                            if (date) setScheduledStartTime(date);
                          }}
                        />
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Dine In Table */}
          {fulfillmentMode === 'DINE_IN' && (
            <View style={styles.deliverySection}>
              <Text style={styles.label}>{store?.requires_table_for_dine_in !== false ? 'Select Table' : 'Select Table (Optional)'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
                <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm }}>
                  {store?.requires_table_for_dine_in === false && (
                    <TouchableOpacity 
                      style={[styles.tableBtn, selectedTable === '' && styles.tableBtnActive]} 
                      onPress={() => setSelectedTable('')}
                    >
                      <Text style={[styles.tableBtnText, selectedTable === '' && styles.tableBtnTextActive]}>Anywhere</Text>
                    </TouchableOpacity>
                  )}
                  {tables.map(t => (
                    <TouchableOpacity 
                      key={t.id} 
                      style={[styles.tableBtn, selectedTable === t.id && styles.tableBtnActive]}
                      onPress={() => setSelectedTable(t.id)}
                    >
                      <Text style={[styles.tableBtnText, selectedTable === t.id && styles.tableBtnTextActive]}>Table {t.number}</Text>
                      <Text style={[styles.tableCapacity, selectedTable === t.id && styles.tableCapacityActive]}>{t.capacity} seats</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Delivery Details */}
          {fulfillmentMode === 'DELIVERY' && (
            <View style={styles.deliverySection}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+255</Text></View>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="712345678"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                />
              </View>

              <View style={styles.labelRow}>
                <Text style={styles.label}>Delivery Address (GPS)</Text>
                <TouchableOpacity onPress={triggerGeolocation} disabled={isLocating}>
                  <Text style={styles.gpsActionText}>{isLocating ? 'Locating...' : 'Recenter GPS'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { opacity: 0.7 }]}
                placeholder="GPS Location"
                placeholderTextColor={colors.text.tertiary}
                value={deliveryLocation}
                editable={false}
              />
              
              <Text style={styles.label}>Directions & Landmarks</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Opposite the main market, green gate..."
                placeholderTextColor={colors.text.tertiary}
                value={deliveryDirections}
                onChangeText={setDeliveryDirections}
                multiline
              />
            </View>
          )}
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          
          {isInstantPayment ? (
            <View style={styles.paidInPersonAlert}>
              <View style={styles.paidIcon}><CreditCard size={20} color={colors.dark[950]} /></View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.paidTitle}>Paid in Person</Text>
                <Text style={styles.paidDesc}>This order will be marked as PAID immediately.</Text>
              </View>
            </View>
          ) : (
            <>
              {store?.payment_methods?.length > 0 && (
                <View style={styles.paymentMethodsGrid}>
                  {store.payment_methods.filter((pm: any) => pm.is_active).map((pm: any) => (
                    <View key={pm.id} style={styles.pmCard}>
                      {(pm.image_url || pm.image) && (
                        <View style={styles.pmImageWrapper}>
                          <Image source={{ uri: pm.image_url || pm.image }} style={styles.pmImage} />
                        </View>
                      )}
                      <Text style={styles.pmProvider}>{pm.provider}</Text>
                      {pm.account_name && <Text style={styles.pmAccountName}>{pm.account_name}</Text>}
                      {pm.account_number && (
                        <View style={styles.pmNumberBox}>
                          <Text style={styles.pmNumber}>{pm.account_number}</Text>
                          <Text style={styles.pmLipa}>LIPA NUMBER</Text>
                        </View>
                      )}
                      {pm.instructions && <Text style={styles.pmInstructions}>{pm.instructions}</Text>}
                    </View>
                  ))}
                </View>
              )}

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
          <View style={styles.sectionHeader}>
            <ShoppingCart size={20} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Summary</Text>
          </View>
          {storeCart.map((item, idx) => (
            <View key={idx} style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>{item.quantity}x {item.product?.name}</Text>
              <PriceDisplay amount={(item.product?.price || 0) * item.quantity} style={styles.summaryItemPrice} />
            </View>
          ))}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <PriceDisplay amount={cartTotal} style={styles.summaryTotalValue} />
          </View>
        </View>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended for you</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
              <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.sm }}>
                {recommendations.map(product => (
                  <View key={product.id} style={styles.recCard}>
                    {product.image && <Image source={{ uri: product.image }} style={styles.recImage} />}
                    <View style={styles.recContent}>
                      <Text style={styles.recName} numberOfLines={1}>{product.name}</Text>
                      <PriceDisplay amount={product.price} style={styles.recPrice} />
                      <TouchableOpacity style={styles.recAddBtn} onPress={() => addToCart(product)}>
                        <Plus size={16} color={colors.dark[950]} />
                        <Text style={styles.recAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <ScalePressable 
          onPress={handleCheckout} 
          disabled={isCheckingOut}
          style={[styles.submitBtn, isCheckingOut && { opacity: 0.7 }]}
        >
          {isCheckingOut ? <ActivityIndicator color={colors.dark[950]} style={{ marginRight: 8 }} /> : null}
          <Text style={styles.submitBtnText}>{isCheckingOut ? 'Processing...' : 'Place Order'}</Text>
          <Send size={20} color={colors.dark[950]} />
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

function ModeTab({ title, active, onPress, icon }: { title: string, active: boolean, onPress: () => void, icon?: React.ReactNode }) {
  return (
    <TouchableOpacity onPress={() => { triggerSelectionHaptic(); onPress(); }} style={[styles.modeTab, active && styles.modeTabActive]}>
      {icon && <View style={{ marginBottom: 4 }}>{icon}</View>}
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark[950] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  scrollContent: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 100 },
  section: { backgroundColor: colors.surfaceHighlight, padding: spacing.lg, borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  modeContainer: { flexDirection: 'row', gap: spacing.sm },
  modeTab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'transparent' },
  modeTabActive: { backgroundColor: colors.primary[500] },
  modeTabText: { color: colors.text.secondary, fontWeight: '600', fontSize: 13 },
  modeTabTextActive: { color: colors.dark[950] },
  label: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.xl, padding: spacing.md, color: colors.text.primary, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', fontSize: 15 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsActionText: { color: colors.primary[400], fontSize: 12, fontWeight: 'bold' },
  phoneRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  phonePrefix: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  phonePrefixText: { color: colors.text.secondary, fontWeight: 'bold', fontSize: 15 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.primary[500] },
  checkboxActive: { backgroundColor: colors.primary[500] },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)', borderStyle: 'dashed' },
  uploadBtnText: { color: colors.primary[400], fontWeight: 'bold' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryItemName: { color: colors.text.secondary, fontSize: 15 },
  summaryItemPrice: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', marginTop: spacing.md, paddingTop: spacing.md },
  summaryTotalLabel: { color: colors.text.primary, fontSize: 18, fontWeight: 'bold' },
  summaryTotalValue: { color: colors.primary[400], fontSize: 20, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.dark[950], borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  submitBtn: { backgroundColor: colors.primary[500], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl },
  submitBtnText: { color: colors.dark[950], fontSize: 18, fontWeight: 'bold' },
  staffAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: spacing.md },
  staffAlertTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 14 },
  staffAlertDesc: { color: colors.text.secondary, fontSize: 12 },
  reservationAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)' },
  resIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center' },
  resAlertTitle: { color: colors.primary[400], fontWeight: 'bold', fontSize: 14 },
  resAlertDesc: { color: colors.text.secondary, fontSize: 12 },
  scheduleContainer: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: spacing.md },
  scheduleToggle: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  scheduleTitle: { color: colors.text.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  scheduleDesc: { color: colors.text.tertiary, fontSize: 12 },
  scheduleOptions: { marginTop: spacing.md, backgroundColor: 'rgba(0,0,0,0.2)', padding: spacing.md, borderRadius: borderRadius.xl },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  datePickerBtn: { flex: 1, backgroundColor: colors.dark[950], padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  datePickerText: { color: colors.text.primary, fontWeight: '600' },
  strategyBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md },
  strategyBtnActive: { backgroundColor: colors.primary[500] },
  strategyText: { color: colors.text.secondary, fontSize: 12, fontWeight: 'bold' },
  strategyTextActive: { color: colors.dark[950] },
  deliverySection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: spacing.md },
  tableBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl, alignItems: 'center' },
  tableBtnActive: { backgroundColor: colors.primary[500] },
  tableBtnText: { color: colors.text.primary, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  tableBtnTextActive: { color: colors.dark[950] },
  tableCapacity: { color: colors.text.secondary, fontSize: 12 },
  tableCapacityActive: { color: 'rgba(0,0,0,0.6)' },
  paidInPersonAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)', marginBottom: spacing.md },
  paidIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  paidTitle: { color: '#4ade80', fontWeight: 'bold', fontSize: 14 },
  paidDesc: { color: colors.text.secondary, fontSize: 12 },
  paymentMethodsGrid: { marginBottom: spacing.lg },
  pmCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: borderRadius.xl, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pmImageWrapper: { width: 60, height: 60, backgroundColor: '#fff', borderRadius: borderRadius.md, padding: 4, marginBottom: spacing.sm },
  pmImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  pmProvider: { color: colors.primary[400], fontWeight: '900', textTransform: 'uppercase', fontSize: 12 },
  pmAccountName: { color: colors.text.secondary, fontSize: 11, fontWeight: 'bold', marginVertical: 4 },
  pmNumberBox: { backgroundColor: colors.dark[950], paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm, alignItems: 'center', width: '100%' },
  pmNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  pmLipa: { color: colors.text.tertiary, fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginTop: 4 },
  pmInstructions: { color: colors.text.tertiary, fontSize: 11, fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center' },
  recCard: { width: 140, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  recImage: { width: '100%', height: 100, resizeMode: 'cover' },
  recContent: { padding: spacing.sm },
  recName: { color: colors.text.primary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  recPrice: { color: colors.primary[400], fontSize: 12, fontWeight: 'bold', marginBottom: spacing.sm },
  recAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary[500], paddingVertical: 6, borderRadius: borderRadius.md, gap: 4 },
  recAddBtnText: { color: colors.dark[950], fontWeight: 'bold', fontSize: 12 }
});
