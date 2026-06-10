import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform, Share, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw, CheckCircle2, Clock, ChefHat, Package, Truck, ShoppingBag, Navigation, Phone, Calendar, Star, AlertCircle, Share2, MapPin, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue, withRepeat, withSequence } from 'react-native-reanimated';

import apiClient, { getWebSocketURL } from '../../services/api';
import { Order } from '../../types';
import { colors, spacing, borderRadius } from '../../theme';
import ScalePressable from '../../components/ScalePressable';
import PriceDisplay from '../../components/PriceDisplay';
import OptimizedImage from '../../components/OptimizedImage';
import { triggerLightHaptic, triggerNotificationHaptic, triggerSuccessHaptic } from '../../hooks/useHaptics';
import { RescheduleModal } from '../../components/orders/RescheduleModal';
import { ReviewModal } from '../../components/orders/ReviewModal';
import { CustomAlert } from '../../components/CustomAlert';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { ScaleIconButton } from '../../components/ScalePressable';
import { useUser } from '../../context/UserContext';

// Pulse Animation for active status
const PulseDot = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseCircle, animatedStyle]} />
      <View style={styles.pulseDot} />
    </View>
  );
};

// Countdown Timer Component
const CountdownTimer = ({ targetTime, prefix = "Expected in: " }: { targetTime: string, prefix?: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(targetTime).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('Expected now');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      const hStr = hours > 0 ? `${hours}h ` : '';
      const mStr = minutes > 0 || hours > 0 ? `${minutes}m ` : '';
      setTimeLeft(`${prefix}${hStr}${mStr}${seconds}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [targetTime, prefix]);

  return <Text style={styles.monoText}>{timeLeft}</Text>;
};

export default function OrderTrackerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.dark[900] : '#121212',
    sectionCard: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? colors.dark[950] : '#000000',
  };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Animated Progress Value
  const progressPercent = useSharedValue(0);

  const fetchOrder = async () => {
    try {
      const res = await apiClient.get(`/orders/${id}/`);
      setOrder(res.data);
      
      // Trigger review modal if COMPLETED and no review yet
      if (res.data.state === 'COMPLETED' && !res.data.has_review && !reviewSubmitted) {
        setShowReviewModal(true);
      }
    } catch (err) {
      console.warn("Could not fetch order", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Polling fallback
    const interval = setInterval(fetchOrder, 30000);

    // WebSocket Connection for instant updates
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isClosed = false;

    const connectWS = async () => {
      if (isClosed) return;
      try {
        const wsUrl = await getWebSocketURL(`/ws/order/${id}/`);
        console.log(`[WS] Connecting to: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_update') {
              console.log("[WS] Received live order status update!");
              triggerNotificationHaptic('success');
              fetchOrder();
            }
          } catch (e) {
            console.error("[WS] Error parsing message:", e);
          }
        };

        socket.onclose = () => {
          console.log("[WS] Connection closed, reconnecting in 5s...");
          if (!isClosed) {
            reconnectTimeout = setTimeout(connectWS, 5000);
          }
        };

        socket.onerror = (e) => {
          console.warn("[WS] Socket error:", e);
          if (socket) socket.close();
        };
      } catch (err) {
        console.warn("[WS] Failed to connect:", err);
        if (!isClosed) {
          reconnectTimeout = setTimeout(connectWS, 5000);
        }
      }
    };

    connectWS();

    return () => {
      isClosed = true;
      clearInterval(interval);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [id, reviewSubmitted]);

  // Handle Progress Bar Animation
  useEffect(() => {
    if (!order) return;
    
    const stateFlow = ['CREATED', 'AWAITING_PAYMENT', 'PAID', 'QUEUED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];
    const currentStateIndex = stateFlow.indexOf(order.state);
    const activeIndex = order.state === 'PAID' ? stateFlow.indexOf('QUEUED') : currentStateIndex;
    
    const displayStates = order.fulfillment_mode === 'DELIVERY' 
        ? ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'] 
        : ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY', 'COMPLETED'];

    let currentStepIndex = 0;
    for (let i = displayStates.length - 1; i >= 0; i--) {
      if (stateFlow.indexOf(displayStates[i]) <= activeIndex) {
        currentStepIndex = i;
        break;
      }
    }

    const targetPercent = (currentStepIndex / (displayStates.length - 1)) * 100;
    progressPercent.value = withTiming(targetPercent, {
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [order]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      height: `${progressPercent.value}%`,
    };
  });

  const handleRenegotiateDeliveryFee = () => {
    CustomAlert.alert(
      "Renegotiate Fee",
      "Are you sure you want to request renegotiation? You will need to call the store.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Request", 
          onPress: async () => {
            try {
              await apiClient.post(`/orders/${order?.id}/renegotiate_delivery_fee/`, {});
              CustomAlert.alert("Request Sent", "Please call the store to finalize.");
              fetchOrder();
            } catch (err) {
              CustomAlert.alert("Failed", "Could not request renegotiation.");
            }
          }
        }
      ]
    );
  };

  const handleNavigate = () => {
    const url = order?.store_latitude && order?.store_longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.store_latitude},${order.store_longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order?.store_location || order?.store_name || '')}`;
    Linking.openURL(url);
  };

  const handleShareOrder = async () => {
    if (!order) return;
    triggerLightHaptic();
    try {
      const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://chapuu.com';
      const url = `${webUrl}/order/track/${order.id}`;
      await Share.share({
        message: `Track my Chapuu order from ${order.store_name}: ${url}`,
        url: url,
        title: `Order #${order.id}`,
      });
    } catch (error) {
      console.warn('[OrderTracker] Share error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]}>
        <View style={{ padding: spacing.xl, gap: spacing.lg }}>
          <LoadingSkeleton style={{ width: '50%', height: 22 }} />
          <LoadingSkeleton style={{ width: '100%', height: 200, borderRadius: 24 }} />
          <LoadingSkeleton style={{ width: '100%', height: 80, borderRadius: 16 }} />
          <LoadingSkeleton style={{ width: '100%', height: 120, borderRadius: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Order not found.</Text>
          <ScalePressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = ['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(order.state);

  if (isCancelled) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]}>
        <View style={styles.centerBox}>
          <Text style={styles.cancelledText}>Order {order.state}</Text>
          <Text style={styles.errorText}>This order is no longer active.</Text>
          <ScalePressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }

  // State Logic
  const stateFlow = ['CREATED', 'AWAITING_PAYMENT', 'PAID', 'QUEUED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];
  const currentStateIndex = stateFlow.indexOf(order.state);
  const activeIndex = order.state === 'PAID' ? stateFlow.indexOf('QUEUED') : currentStateIndex;
  
  const displayStates = order.fulfillment_mode === 'DELIVERY' 
      ? ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'] 
      : ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY', 'COMPLETED'];

  const getIcon = (state: string, color: string) => {
      switch (state) {
          case 'AWAITING_PAYMENT': return <Clock size={20} color={color} />;
          case 'QUEUED': return <Clock size={20} color={color} />;
          case 'PREPARING': return <ChefHat size={20} color={color} />;
          case 'READY': return <Package size={20} color={color} />;
          case 'OUT_FOR_DELIVERY': return <Truck size={20} color={color} />;
          case 'COMPLETED': return <ShoppingBag size={20} color={color} />;
          default: return <Clock size={20} color={color} />;
      }
  };

  const getStatusText = (state: string) => {
      switch (state) {
          case 'AWAITING_PAYMENT': return 'Payment Verification';
          case 'PAID':
          case 'QUEUED': return order.scheduled_time ? 'Scheduled & Confirmed' : 'Received & In Queue';
          case 'PREPARING': return 'Kitchen is Preparing';
          case 'READY': return order.fulfillment_mode === 'DELIVERY' ? 'Ready for Dispatch' : 'Ready for Pickup / Service';
          case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
          case 'COMPLETED': return 'Completed';
          default: return 'Processing';
      }
  };

  const getReservationColors = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return { bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' };
      case 'ACTIVE': return { bg: 'rgba(6, 182, 212, 0.05)', border: 'rgba(6, 182, 212, 0.3)', text: '#22d3ee' };
      case 'PENDING': return { bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' };
      case 'COMPLETED': return { bg: 'rgba(168, 85, 247, 0.05)', border: 'rgba(168, 85, 247, 0.3)', text: '#c084fc' };
      default: return { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.1)', text: colors.text.secondary };
    }
  };

  const resColors = getReservationColors(order.reservation_status || '');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      {/* Premium Gradient Header */}
      <View style={styles.header}>
        <ScalePressable style={[styles.headerIconBtn, { backgroundColor: activeColors.border }]} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text.secondary} />
        </ScalePressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Order #{order.id}</Text>
          <Text style={styles.headerSubtitle}>{order.store_name || `Store #${order.store}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <ScalePressable style={[styles.headerIconBtn, { backgroundColor: activeColors.border }]} onPress={handleShareOrder}>
            <Share2 size={18} color={colors.text.secondary} />
          </ScalePressable>
          <ScalePressable style={[styles.headerIconBtn, { backgroundColor: activeColors.border }]} onPress={fetchOrder}>
            <RefreshCw size={18} color={colors.text.secondary} />
          </ScalePressable>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Modern Live Status Card */}
        <View style={[styles.statusHeroCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
          <View style={styles.heroInfo}>
            <View style={styles.heroLabelGroup}>
              <PulseDot />
              <Text style={styles.heroStatusLabel}>Current Status</Text>
            </View>
            <Text style={styles.heroStatusText}>{getStatusText(order.state)}</Text>
            {order.scheduled_time && (
              <View style={styles.heroCountdown}>
                <Clock size={14} color={colors.primary[400]} />
                <CountdownTimer targetTime={order.scheduled_time} prefix="Fulfilling in: " />
              </View>
            )}
          </View>
          
          <View style={styles.timelineContainer}>
            <View style={[styles.timelineTrackBg, { backgroundColor: activeColors.border }]} />
            <Animated.View style={[styles.timelineTrackFill, animatedProgressStyle]} />

            {displayStates.map((state) => {
              const targetStateIndex = stateFlow.indexOf(state);
              const isPast = activeIndex > targetStateIndex;
              const isCurrent = activeIndex === targetStateIndex;
              const isFinished = isPast || (isCurrent && state === 'COMPLETED');

              const iconColor = isFinished ? colors.dark[950] : isCurrent ? colors.primary[500] : colors.text.tertiary;

              return (
                <View key={state} style={[styles.timelineItem, (isCurrent || isPast) ? { opacity: 1 } : { opacity: 0.4 }]}>
                  <View style={[
                    styles.timelineIconWrapper,
                    { 
                      backgroundColor: isFinished ? colors.primary[500] : isCurrent ? activeColors.bg : activeColors.card,
                      borderColor: isFinished ? colors.primary[600] : isCurrent ? colors.primary[500] : activeColors.border
                    }
                  ]}>
                    {isFinished ? <CheckCircle2 size={20} color={iconColor} /> : getIcon(state, iconColor)}
                  </View>
                  <View style={styles.timelineTextWrapper}>
                    <Text style={[styles.timelineStatusText, isCurrent && styles.timelineStatusTextCurrent, isPast && { color: '#fff' }]}>
                      {getStatusText(state)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Store Quick Info */}
        <View style={[styles.storeMiniCard, { borderColor: activeColors.border }]}>
          <OptimizedImage src={order.store_image || ''} wrapperStyle={styles.storeMiniLogo} placeholderType="store" />
          <View style={styles.storeMiniInfo}>
            <Text style={styles.storeMiniName}>{order.store_name}</Text>
            <View style={styles.storeMiniLocation}>
              <MapPin size={10} color={colors.text.tertiary} />
              <Text style={styles.storeMiniLocText} numberOfLines={1}>{order.store_location}</Text>
            </View>
          </View>
          {order.store_phone && (
            <ScalePressable style={styles.callStoreBtn} onPress={() => Linking.openURL(`tel:${order.store_phone}`)}>
              <Phone size={18} color={colors.primary[500]} />
            </ScalePressable>
          )}
        </View>

        {/* Premium Reservation Ticket */}
        {order.fulfillment_mode === 'RESERVATION' && (
          <View style={[styles.card, { backgroundColor: resColors.bg, borderColor: resColors.border }]}>
            <View style={styles.flexRowBetween}>
              <View style={styles.flexRow}>
                <View style={[styles.iconBox, { borderColor: resColors.border }]}>
                  <Calendar size={20} color={resColors.text} />
                </View>
                <View>
                  <Text style={styles.label}>Fulfillment Mode</Text>
                  <Text style={styles.cardTitle}>VIP Reservation</Text>
                </View>
              </View>
              <View style={[styles.statusPill, { backgroundColor: resColors.bg, borderColor: resColors.border }]}>
                <Text style={[styles.statusPillText, { color: resColors.text }]}>{order.reservation_status || 'PENDING'}</Text>
              </View>
            </View>

            <View style={styles.ticketGrid}>
              <View style={styles.ticketGridItem}>
                <Text style={styles.label}>Date & Time</Text>
                <Text style={styles.valueText}>
                  {order.reservation_time 
                    ? new Date(order.reservation_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Not Scheduled'}
                </Text>
              </View>
              
              <View style={styles.ticketGridItem}>
                <Text style={styles.label}>Guests Seated</Text>
                <Text style={styles.valueText}>{order.reservation_guest_count || 1} Guests</Text>
              </View>

              <View style={styles.ticketGridItem}>
                <Text style={styles.label}>Table Number</Text>
                <Text style={[styles.valueText, order.table_number ? { color: colors.primary[400] } : {}]}>
                  {order.table_number ? `Table #${order.table_number}` : 'Assigned on Arrival'}
                </Text>
              </View>
            </View>

            <View style={styles.ticketStub}>
              <Text style={styles.label}>Instructions</Text>
              <Text style={styles.ticketStubText}>
                {order.reservation_status === 'PENDING' && "We are waiting to verify your deposit. Check back soon!"}
                {order.reservation_status === 'CONFIRMED' && "Your reservation is confirmed. Present this ticket at the host stand."}
                {order.reservation_status === 'ACTIVE' && "Your dining session is active. Welcome to your reserved table!"}
                {order.reservation_status === 'COMPLETED' && "Thank you for dining with us! Hope you enjoyed your experience."}
                {!['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(order.reservation_status || '') && "Present this booking screen at the host stand upon arrival."}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Details & Navigation */}
        {order.fulfillment_mode === 'DELIVERY' && (
          <View style={[styles.card, { backgroundColor: activeColors.sectionCard, borderColor: activeColors.border }]}>
            <View style={styles.flexRowBetween}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>
              <ScalePressable style={styles.mapLink} onPress={handleNavigate}>
                <Text style={styles.mapLinkText}>View on Map</Text>
                <ChevronRight size={14} color={colors.primary[400]} />
              </ScalePressable>
            </View>
            
            <View style={styles.addressRow}>
              <View style={[styles.addressIconWrapper, { backgroundColor: activeColors.border }]}>
                <MapPin size={18} color={colors.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.valueText}>{order.delivery_location || 'Not provided'}</Text>
                {order.delivery_directions && (
                  <Text style={styles.noteText}>{order.delivery_directions}</Text>
                )}
              </View>
            </View>

            <View style={[styles.feeCard, { borderColor: activeColors.border }]}>
              <View style={styles.flexRowBetween}>
                <Text style={styles.invoiceLabel}>Delivery Fee (Pay Rider)</Text>
                <PriceDisplay amount={order.delivery_fee || 0} style={styles.deliveryFeeValue} />
              </View>
              <View style={styles.negotiationRow}>
                <View style={[styles.statusPill, 
                  order.delivery_fee_status === 'AGREED' ? { borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.05)' } :
                  order.delivery_fee_status === 'RENEGOTIATE' ? { borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' } : { borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }
                ]}>
                  <Text style={[styles.statusPillText, 
                    order.delivery_fee_status === 'AGREED' ? { color: '#34d399' } :
                    order.delivery_fee_status === 'RENEGOTIATE' ? { color: '#ef4444' } : { color: '#fbbf24' }
                  ]}>
                    {order.delivery_fee_status === 'AGREED' ? 'Fee Agreed' : order.delivery_fee_status === 'RENEGOTIATE' ? 'Renegotiating' : 'Fee Pending'}
                  </Text>
                </View>
                {order.delivery_fee_status === 'AGREED' && (
                  <ScalePressable onPress={handleRenegotiateDeliveryFee}>
                    <Text style={styles.renegotiateLink}>Change?</Text>
                  </ScalePressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Handoff Code for Pickups/Deliveries */}
        {((order.fulfillment_mode === 'DELIVERY' && order.state === 'OUT_FOR_DELIVERY') ||
          (['PICKUP', 'TAKEAWAY'].includes(order.fulfillment_mode) && order.state === 'READY')) && (
          <View style={[styles.card, styles.highlightCard, { borderColor: activeColors.border }]}>
            <Text style={styles.highlightCardTitle}>Handoff Verification Code</Text>
            <Text style={styles.highlightCardDesc}>Give this code to the driver or cashier.</Text>
            <View style={styles.codeWrapper}>
              <Text style={styles.codeText}>{order.delivery_code || '------'}</Text>
            </View>
          </View>
        )}

        {/* Invoice / Order Items Details */}
        <View style={[styles.card, { backgroundColor: activeColors.sectionCard, borderColor: activeColors.border }]}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemList}>
            {(Array.isArray(order.items) ? order.items : []).map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={[styles.flexRow, { flex: 1, paddingRight: spacing.md }]}>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.itemQty}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || 'Item'}</Text>
                </View>
                <PriceDisplay amount={item.unit_price * item.quantity} style={styles.itemPrice} />
              </View>
            ))}
            {(Array.isArray(order.pos_custom_items) ? order.pos_custom_items : []).map((item: any, idx: number) => (
              <View key={`custom-${idx}`} style={[styles.itemRow, { backgroundColor: 'rgba(234, 179, 8, 0.03)', borderColor: 'rgba(234, 179, 8, 0.1)', borderWidth: 1 }]}>
                <View style={[styles.flexRow, { flex: 1, paddingRight: spacing.md }]}>
                  <View style={[styles.qtyBadge, { backgroundColor: 'rgba(234, 179, 8, 0.2)' }]}>
                    <Text style={styles.itemQty}>{item.quantity}</Text>
                  </View>
                  <Text style={[styles.itemName, { color: '#fef08a' }]} numberOfLines={1}>{item.name}</Text>
                </View>
                <PriceDisplay amount={item.price * item.quantity} style={styles.itemPrice} />
              </View>
            ))}
          </View>

          <View style={[styles.totalBreakdown, { borderTopColor: activeColors.border }]}>
            <View style={styles.flexRowBetween}>
              <Text style={styles.invoiceLabel}>Subtotal</Text>
              <PriceDisplay amount={Number(order.total_amount || 0) - Number(order.delivery_fee || 0)} style={styles.invoiceValue} />
            </View>
            {(order.delivery_fee || 0) > 0 && (
              <View style={styles.flexRowBetween}>
                <Text style={styles.invoiceLabel}>Delivery</Text>
                <PriceDisplay amount={order.delivery_fee || 0} style={styles.invoiceValue} />
              </View>
            )}
            <View style={[styles.flexRowBetween, styles.grandTotalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <PriceDisplay amount={order.total_amount} style={styles.totalValue} />
            </View>
          </View>
        </View>

        {/* Review Feedback Display */}
        {order.has_review && order.review_details && (
          <View style={[styles.card, { backgroundColor: 'rgba(234, 179, 8, 0.05)', borderColor: 'rgba(234, 179, 8, 0.2)' }]}>
            <View style={styles.flexRow}>
              <Star size={18} color="#eab308" fill="#eab308" />
              <Text style={[styles.sectionTitle, { color: '#eab308', marginBottom: 0, marginLeft: 8 }]}>Your Feedback</Text>
            </View>
            <View style={[styles.flexRow, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={16} color={order.review_details.rating >= star ? '#eab308' : colors.text.tertiary} fill={order.review_details.rating >= star ? '#eab308' : 'transparent'} />
              ))}
            </View>
            {!!order.review_details.comment && (
              <Text style={styles.reviewComment}>"{order.review_details.comment}"</Text>
            )}
          </View>
        )}

      </ScrollView>

      {/* Modals */}
      {order && (
        <>
          <RescheduleModal 
            visible={showRescheduleModal} 
            orderId={order.id} 
            currentScheduledTime={order.scheduled_time || ''} 
            onClose={() => setShowRescheduleModal(false)}
            onSuccess={() => { setShowRescheduleModal(false); fetchOrder(); }}
          />
          <ReviewModal 
            visible={showReviewModal}
            orderId={order.id}
            storeId={order.store}
            onClose={() => setShowReviewModal(false)}
            onSuccess={() => { setShowReviewModal(false); setReviewSubmitted(true); fetchOrder(); }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerIconBtn: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl },
  headerTitles: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: colors.text.primary, textTransform: 'uppercase', letterSpacing: 1 },
  headerSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: spacing.md, gap: spacing.lg },
  
  // Status Hero Card
  statusHeroCard: { backgroundColor: colors.dark[900], borderRadius: borderRadius['3xl'], padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  heroInfo: { marginBottom: spacing.xl, alignItems: 'center' },
  heroLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  heroStatusLabel: { fontSize: 10, fontWeight: '900', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 2 },
  heroStatusText: { fontSize: 24, fontWeight: '900', color: colors.text.primary, textAlign: 'center' },
  heroCountdown: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(234, 179, 8, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: borderRadius.full },
  
  // Pulse
  pulseContainer: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary[500] },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary[500] },

  // Timeline
  timelineContainer: { marginTop: spacing.md, paddingLeft: 10 },
  timelineTrackBg: { position: 'absolute', left: 31, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1 },
  timelineTrackFill: { position: 'absolute', left: 31, top: 0, width: 2, backgroundColor: colors.primary[500], borderRadius: 1, shadowColor: colors.primary[500], shadowRadius: 10, shadowOpacity: 0.5 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, height: 60, marginBottom: 4 },
  timelineIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark[900], borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  timelineIconFinished: { backgroundColor: colors.primary[500], borderColor: colors.primary[600] },
  timelineIconCurrent: { backgroundColor: colors.dark[950], borderColor: colors.primary[500] },
  timelineTextWrapper: { flex: 1 },
  timelineStatusText: { fontSize: 13, fontWeight: '700', color: colors.text.tertiary },
  timelineStatusTextCurrent: { color: colors.primary[400], fontSize: 15 },
  
  // Store Mini Card
  storeMiniCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  storeMiniLogo: { width: 40, height: 40, borderRadius: borderRadius.lg },
  storeMiniInfo: { flex: 1, marginLeft: spacing.md },
  storeMiniName: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
  storeMiniLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  storeMiniLocText: { fontSize: 11, color: colors.text.tertiary },
  callStoreBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(234, 179, 8, 0.1)', alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: colors.surfaceHighlight, borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: spacing.xl },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1.5 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, textTransform: 'uppercase', letterSpacing: 1 },
  
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  flexRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 10, fontWeight: 'bold', color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 4 },
  valueText: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
  noteText: { fontSize: 12, color: colors.text.tertiary, fontStyle: 'italic', marginTop: 4 },
  
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapLinkText: { fontSize: 12, fontWeight: 'bold', color: colors.primary[400] },
  addressRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignItems: 'flex-start' },
  addressIconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

  feeCard: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  deliveryFeeValue: { fontSize: 16, fontWeight: '900', color: colors.primary[400] },
  negotiationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  renegotiateLink: { fontSize: 12, fontWeight: 'bold', color: colors.text.tertiary, textDecorationLine: 'underline' },

  // Reservation Styles
  iconBox: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: spacing.md },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1 },
  statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  ticketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginVertical: spacing.xl },
  ticketGridItem: { minWidth: '45%' },
  ticketStub: { backgroundColor: 'rgba(0,0,0,0.3)', padding: spacing.md, borderRadius: borderRadius.xl, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ticketStubText: { fontSize: 12, color: colors.text.secondary, lineHeight: 18 },

  // Items
  itemList: { marginTop: spacing.lg, gap: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: spacing.md, borderRadius: borderRadius.xl },
  qtyBadge: { backgroundColor: 'rgba(234, 179, 8, 0.1)', width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  itemQty: { fontSize: 12, fontWeight: '900', color: colors.primary[500] },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.text.primary, flex: 1 },
  itemPrice: { fontSize: 13, fontWeight: 'bold', color: colors.text.secondary },

  totalBreakdown: { marginTop: spacing.xl, gap: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: spacing.xl },
  invoiceLabel: { fontSize: 13, color: colors.text.tertiary },
  invoiceValue: { fontSize: 13, fontWeight: 'bold', color: colors.text.secondary },
  grandTotalRow: { marginTop: spacing.sm },
  totalLabel: { fontSize: 16, fontWeight: '900', color: colors.text.primary, textTransform: 'uppercase' },
  totalValue: { fontSize: 22, fontWeight: '900', color: colors.text.primary },

  reviewComment: { fontSize: 14, color: colors.text.secondary, fontStyle: 'italic', marginBottom: spacing.md, lineHeight: 20 },
  errorText: { fontSize: 14, color: colors.text.tertiary, marginBottom: spacing.xl },
  cancelledText: { fontSize: 20, fontWeight: '900', color: colors.text.primary, textTransform: 'uppercase', marginBottom: 4 },
  backBtn: { backgroundColor: colors.primary[500], paddingHorizontal: 24, paddingVertical: 12, borderRadius: borderRadius.xl },
  backBtnText: { color: colors.dark[950], fontWeight: '900', textTransform: 'uppercase' },
  monoText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', color: colors.primary[400], fontSize: 12 },
  highlightCard: { backgroundColor: 'rgba(234, 179, 8, 0.05)', borderColor: 'rgba(234, 179, 8, 0.2)', alignItems: 'center' },
  highlightCardTitle: { fontSize: 14, fontWeight: '900', color: colors.primary[400], textTransform: 'uppercase', marginBottom: 4 },
  highlightCardDesc: { fontSize: 11, color: colors.text.secondary, marginBottom: spacing.lg },
  codeWrapper: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  codeText: { fontSize: 28, fontWeight: '900', color: colors.primary[500], letterSpacing: 6 },
});
