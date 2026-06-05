import { useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../services/api';
import { CustomAlert } from '../components/CustomAlert';
import { useUser } from '../context/UserContext';
import { CartItem } from '../types';
import { triggerLightHaptic, triggerNotificationHaptic } from './useHaptics';

export function useCheckoutSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { updateCart, updateActiveOrderCount, activeOrderCount, token, userRole } = useUser();

  const handleCheckout = async ({
    cart,
    storeId,
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
    selectedTable
  }: {
    cart: CartItem[];
    storeId: string;
    orderMethod: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
    paymentMessage: string;
    isInstantPayment: boolean;
    receiptUri: string | null;
    deliveryLocation: string;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    deliveryDirections: string;
    phoneNumber: string;
    isScheduled: boolean;
    scheduledTime: Date;
    prepTimeOption: 'DYNAMIC' | 'CUSTOM';
    scheduledStartTime: Date;
    activeReservation: number | null;
    setActiveReservation: (r: number | null) => void;
    selectedTable: string;
  }) => {
    if (cart.length === 0) return;

    if (orderMethod === 'DELIVERY' && (!deliveryLocation.trim() || !phoneNumber.trim())) {
      CustomAlert.alert("Missing Details", "Please provide a delivery location and phone number.");
      return;
    }

    if (!isInstantPayment && !paymentMessage.trim()) {
      CustomAlert.alert("Missing Details", "Please provide a Transaction ID or Proof of Payment.");
      return;
    }

    triggerLightHaptic();
    setIsSubmitting(true);

    try {
      const orderItems = cart.map(item => ({
        product: item.product?.id,
        quantity: item.quantity,
      }));

      const payload: any = {
        store: parseInt(storeId, 10),
        fulfillment_mode: activeReservation ? 'RESERVATION' : orderMethod,
        payment_message: isInstantPayment ? 'Instant Payment (Walk-in)' : paymentMessage,
        is_instant_payment: isInstantPayment,
        items: orderItems,
      };

      if (orderMethod === 'DELIVERY') {
        payload.customer_phone = `+255${phoneNumber}`;
        payload.delivery_location = deliveryLocation;
        if (deliveryLatitude) payload.delivery_latitude = parseFloat(deliveryLatitude.toFixed(6));
        if (deliveryLongitude) payload.delivery_longitude = parseFloat(deliveryLongitude.toFixed(6));
        if (deliveryDirections) payload.delivery_directions = deliveryDirections;
      } else if (orderMethod === 'DINE_IN') {
        if (selectedTable) {
          payload.table = parseInt(selectedTable, 10);
        }
      }

      if (activeReservation) {
        payload.reservation = activeReservation;
      }

      if (isScheduled) {
        payload.scheduled_time = scheduledTime.toISOString();
        payload.prep_time_option = prepTimeOption;
        if (prepTimeOption === 'CUSTOM') {
          payload.scheduled_start_time = scheduledStartTime.toISOString();
        }
      }

      const res = await apiClient.post('/orders/', payload);
      const orderId = res.data?.id;

      if (receiptUri && orderId) {
        const filename = receiptUri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        const patchData = new FormData();
        patchData.append('payment_receipt', {
          uri: Platform.OS === 'ios' ? receiptUri.replace('file://', '') : receiptUri,
          name: filename,
          type,
        } as any);

        await apiClient.patch(`/orders/${orderId}/`, patchData);
      }

      // Clear the local cart
      updateCart([]);
      
      // Attempt to clear active reservation if it was used
      if (orderMethod === 'DINE_IN' && activeReservation) {
        setActiveReservation(null);
      }

      // Optimistically update order count
      if (token && userRole === 'CUSTOMER') {
        updateActiveOrderCount(activeOrderCount + 1);
      }

      triggerNotificationHaptic('success');

      CustomAlert.alert(
        "Order Placed!",
        `Your order #${res.data?.id || ''} has been received.`,
        [{ 
          text: "Track Order", 
          onPress: () => router.replace(`/order/${res.data?.id || ''}` as any) 
        }]
      );

    } catch (err: any) {
      console.warn('[Checkout] Submission Failed:', err);
      const detail = err?.message || 'Failed to place order. Please try again.';
      CustomAlert.alert("Checkout Failed", detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleCheckout, isSubmitting };
}
