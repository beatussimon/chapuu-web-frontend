import React, { createContext, useContext } from 'react';
import { CartItem } from '../types';

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  name: string | null;
  granted: boolean;
}

export interface UserContextType {
  userRole: string | null;
  token: string | null;
  refreshToken: string | null;
  profileData: any | null;
  loyaltyPoints: number;
  cart: CartItem[];
  userLocation: UserLocation;
  savedStores: number[];
  activeOrderCount: number;
  pendingDeepLinkPath: string | null;
  activeReservation: number | null;
  updateUser: (role: string | null, token: string | null, refreshToken?: string | null) => void;
  updateCart: (cart: CartItem[]) => void;
  updateUserLocation: (loc: UserLocation) => void;
  updateSavedStores: (stores: number[]) => void;
  updateActiveOrderCount: (count: number) => void;
  setPendingDeepLinkPath: (path: string | null) => void;
  setActiveReservation: (reservationId: number | null) => void;
  requestLocationPermission: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  userRole: 'CUSTOMER',
  token: null,
  refreshToken: null,
  profileData: null,
  loyaltyPoints: 0,
  cart: [],
  userLocation: { lat: null, lng: null, name: null, granted: false },
  savedStores: [],
  activeOrderCount: 0,
  pendingDeepLinkPath: null,
  activeReservation: null,
  updateUser: () => {},
  updateCart: () => {},
  updateUserLocation: () => {},
  updateSavedStores: () => {},
  updateActiveOrderCount: () => {},
  setPendingDeepLinkPath: () => {},
  setActiveReservation: () => {},
  requestLocationPermission: async () => {},
  fetchUserProfile: async () => {},
});

export const useUser = () => useContext(UserContext);
