import React, { createContext, useContext } from 'react';

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  name: string | null;
  granted: boolean;
}

export interface UserContextType {
  userRole: string | null;
  token: string | null;
  cart: any[];
  userLocation: UserLocation;
  savedStores: number[];
  activeOrderCount: number;
  updateUser: (role: string | null, token: string | null) => void;
  updateCart: (cart: any[]) => void;
  updateUserLocation: (loc: UserLocation) => void;
  updateSavedStores: (stores: number[]) => void;
  updateActiveOrderCount: (count: number) => void;
  requestLocationPermission: () => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  userRole: 'CUSTOMER',
  token: null,
  cart: [],
  userLocation: { lat: null, lng: null, name: null, granted: false },
  savedStores: [],
  activeOrderCount: 0,
  updateUser: () => {},
  updateCart: () => {},
  updateUserLocation: () => {},
  updateSavedStores: () => {},
  updateActiveOrderCount: () => {},
  requestLocationPermission: async () => {},
});

export const useUser = () => useContext(UserContext);
