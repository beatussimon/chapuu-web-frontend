import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, MessageCircle, MapPin, Search } from 'lucide-react-native';

import apiClient from '../../../services/api';
import { colors, spacing, borderRadius } from '../../../theme';
import ScalePressable from '../../../components/ScalePressable';
import PriceDisplay from '../../../components/PriceDisplay';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import { triggerLightHaptic, triggerSelectionHaptic } from '../../../hooks/useHaptics';
import { useUser } from '../../../context/UserContext';

export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme, setPendingDeepLinkPath } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    cardBg: theme === 'legacy' ? 'rgba(255,255,255,0.03)' : '#121212',
  };
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/orders/${id}/`)
      .then(res => setOrder(res.data))
      .catch(err => console.error("Failed to fetch order", err))
      .finally(() => setLoading(false));
  }, [id]);

  const composeMessage = () => {
    if (!order) return "";
    let msg = `Order Received! #${order.id}\nTotal: TZS ${order.total_amount}\n`;
    if (order.fulfillment_mode === 'RESERVATION') {
      msg += `Reservation: #${order.reservation}\n`;
    } else if (order.scheduled_time) {
      msg += `Scheduled for: ${new Date(order.scheduled_time).toLocaleString()}\n`;
    }
    
    msg += `Items:\n`;
    order.items?.forEach((item: any) => {
      msg += `- ${item.quantity}x ${item.product_name || 'Product'} (TZS ${item.unit_price})\n`;
    });
    
    if (order.payment_message) {
      msg += `\nPayment Info: ${order.payment_message}`;
    }
    
    return msg;
  };

  const handleSendSMS = async () => {
    triggerSelectionHaptic();
    if (!order?.store?.phone) {
      Alert.alert("Store Phone Not Available", "Cannot send SMS. Please contact the store directly.");
      return;
    }
    
    const message = composeMessage();
    let phoneStr = order.store.phone.replace(/[^0-9+]/g, '');
    
    let url;
    if (Platform.OS === 'ios') {
      url = `sms:${phoneStr}&body=${encodeURIComponent(message)}`;
    } else {
      url = `sms:${phoneStr}?body=${encodeURIComponent(message)}`;
    }
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "SMS is not available on this device");
      }
    } catch (e) {
      Alert.alert("Error", "Could not open messaging app");
    }
  };

  const navigateToTrack = () => {
    triggerLightHaptic();
    setPendingDeepLinkPath(`/order/track/${id}`);
    router.replace('/(tabs)/tab4');
  };

  const keepBrowsing = () => {
    triggerLightHaptic();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
        <View style={styles.content}>
          <LoadingSkeleton style={{ width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 20 }} />
          <LoadingSkeleton style={{ width: '60%', height: 30, alignSelf: 'center', marginBottom: 10 }} />
          <LoadingSkeleton style={{ width: '80%', height: 20, alignSelf: 'center' }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Order not found.</Text>
          <ScalePressable onPress={keepBrowsing} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Go to Home</Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successIconWrapper}>
          <CheckCircle size={64} color={colors.success} />
        </View>
        <Text style={styles.title}>Order Received!</Text>
        <Text style={styles.subtitle}>Order #{order.id}</Text>

        <View style={[styles.card, { backgroundColor: activeColors.cardBg, borderColor: activeColors.border }]}>
          <Text style={styles.cardTitle}>Payment Confirmation</Text>
          <Text style={styles.cardDesc}>
            Your order has been placed. You can send a confirmation SMS to the store.
          </Text>
          
          <View style={[styles.messagePreviewBox, { borderColor: activeColors.border }]}>
            <Text style={styles.messagePreviewText}>{composeMessage()}</Text>
          </View>
          
          <ScalePressable onPress={handleSendSMS} style={styles.smsBtn}>
            <MessageCircle size={20} color="#fff" />
            <Text style={styles.smsBtnText}>Send SMS Confirmation</Text>
          </ScalePressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: activeColors.card, borderTopColor: activeColors.border }]}>
        <ScalePressable onPress={navigateToTrack} style={styles.trackBtn}>
          <MapPin size={20} color={colors.dark[950]} />
          <Text style={styles.trackBtnText}>Track Order</Text>
        </ScalePressable>
        <ScalePressable onPress={keepBrowsing} style={styles.outlineBtn}>
          <Search size={20} color={colors.primary[400]} />
          <Text style={styles.outlineBtnText}>Keep Browsing</Text>
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  successIconWrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  headerBlock: {
    backgroundColor: colors.surfaceHighlight,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  messagePreviewBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.lg,
  },
  messagePreviewText: {
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#3b82f6',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  smsBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceHighlight,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: spacing.md,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  trackBtnText: {
    color: colors.dark[950],
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[400],
  },
  outlineBtnText: {
    color: colors.primary[400],
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.error,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.lg,
  }
});
