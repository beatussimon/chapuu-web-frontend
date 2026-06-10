import React from 'react';

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  name: string | null;
  granted: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  [key: string]: unknown;
}

export interface CartItem {
  id: number | string;
  product?: Product;
  quantity: number;
  [key: string]: unknown;
}

export interface NativeState {
  token: string | null;
  userRole: string | null;
  cart: CartItem[];
  userLocation: UserLocation;
  savedStores: number[];
}

export interface MenuItem {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

export interface UserProfile {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  [key: string]: unknown;
}

export interface TokenResponse {
  access: string;
  refresh?: string;
}

export interface ErrorData {
  detail?: string;
  [key: string]: unknown;
}

export type BridgeMessage =
  | { type: 'STORAGE_UPDATE'; payload: { state: NativeState } }
  | { type: 'STATE_SYNC'; payload: { state: NativeState } }
  | { type: 'ACTIVE_ORDERS_COUNT'; payload: { count: number } }
  | { type: 'UNAUTHORIZED' }
  | {
      type: 'ORDER_STATUS_NOTIFICATION';
      payload: {
        orderId: number | string;
        state: string;
        storeName: string;
        fulfillmentMode: string;
      };
    }
  | { type: 'FOCUS_CHANGE'; payload: { isFocused: boolean } }
  | { type: 'SCROLL_POSITION'; payload: { y: number } };

export interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  [key: string]: any;
}

export interface Order {
  id: string | number;
  store: string | number;
  store_id?: string | number;
  store_name?: string;
  store_image?: string;
  store_phone?: string;
  store_location?: string;
  store_latitude?: number;
  store_longitude?: number;
  store_directions?: string;
  state: string;
  fulfillment_mode: 'DELIVERY' | 'PICKUP' | 'DINE_IN' | 'RESERVATION' | 'TAKEAWAY';
  total_amount: number;
  items: OrderItem[];
  created_at: string;
  scheduled_time?: string;
  scheduled_start_time?: string;
  delivery_location?: string;
  delivery_directions?: string;
  delivery_fee?: number;
  delivery_fee_status?: string;
  delivery_code?: string;
  reservation_status?: string;
  reservation_time?: string;
  reservation_guest_count?: number;
  table_number?: string;
  reschedule_status?: string;
  reschedule_rejection_reason?: string;
  reschedule_count?: number;
  reschedule_requests?: any[];
  has_review?: boolean;
  review_details?: any;
  pos_custom_items?: any[];
}

export interface Reservation {
  id: string | number;
  store?: string | number;
  store_id?: string | number;
  store_name?: string;
  status: string;
  reservation_time: string;
  guest_count: number;
  duration_minutes: number;
  table_number?: string;
  can_modify: boolean;
  linked_order?: Order;
}

export interface Review {
  id: string | number;
  rating: number;
  comment: string;
  created_at: string;
}
