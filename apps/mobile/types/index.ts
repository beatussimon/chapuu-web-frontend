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
