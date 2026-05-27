import React, { createContext, useContext, useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  ActivityIndicator, 
  StatusBar, 
  Modal, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Linking, 
  Platform,
  Image 
} from 'react-native';
import * as Location from 'expo-location';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';

// Configure notification behavior safely
try {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('Failed to set notification handler:', e);
}

interface UserLocation {
  lat: number | null;
  lng: number | null;
  name: string | null;
  granted: boolean;
}

interface UserContextType {
  userRole: string | null;
  token: string | null;
  cart: any[];
  userLocation: UserLocation;
  activeOrderCount: number;
  updateUser: (role: string | null, token: string | null) => void;
  updateCart: (cart: any[]) => void;
  updateUserLocation: (loc: UserLocation) => void;
  updateActiveOrderCount: (count: number) => void;
  requestLocationPermission: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  userRole: 'CUSTOMER',
  token: null,
  cart: [],
  userLocation: { lat: null, lng: null, name: null, granted: false },
  activeOrderCount: 0,
  updateUser: () => {},
  updateCart: () => {},
  updateUserLocation: () => {},
  updateActiveOrderCount: () => {},
  requestLocationPermission: async () => {},
});

export const useUser = () => useContext(UserContext);

export default function RootLayout() {
  const [userRole, setUserRole] = useState<string | null>('CUSTOMER');
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    lat: null,
    lng: null,
    name: null,
    granted: false,
  });
  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // Load cached role/token/cart/location on mount
  useEffect(() => {
    async function loadCachedData() {
      try {
        const cachedRole = await AsyncStorage.getItem('chapuu_user_role');
        const cachedToken = await AsyncStorage.getItem('chapuu_access_token');
        const cachedCart = await AsyncStorage.getItem('chapuu_cart');
        const cachedLoc = await AsyncStorage.getItem('chapuu_location');
        const cachedHasLoggedIn = await AsyncStorage.getItem('chapuu_has_logged_in');

        if (cachedRole) setUserRole(cachedRole);
        if (cachedToken) setToken(cachedToken);
        if (cachedCart) setCart(JSON.parse(cachedCart));
        if (cachedLoc) setUserLocation(JSON.parse(cachedLoc));
        if (cachedHasLoggedIn === 'true') setHasLoggedIn(true);
      } catch (e) {
        // Silent error
      } finally {
        setIsReady(true);
      }
    }
    loadCachedData();
  }, []);

  // Auth routing guard redirect
  useEffect(() => {
    if (!isReady) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'onboarding' || currentSegment === 'login' || currentSegment === 'signup';

    if (!token) {
      if (hasLoggedIn && currentSegment === 'onboarding') {
        router.replace('/login');
      } else if (!inAuthGroup) {
        if (hasLoggedIn) {
          router.replace('/login');
        } else {
          router.replace('/onboarding');
        }
      }
    } else {
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [token, segments, isReady, hasLoggedIn]);

  // Request notifications permission on login
  useEffect(() => {
    async function registerForPushNotifications() {
      if (Platform.OS === 'web') return;

      try {
        const { status: existingStatus } = await getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (e) {
        console.warn('Failed to request notifications permission:', e);
      }
    }
    if (isReady && token) {
      registerForPushNotifications();
    }
  }, [isReady, token]);

  // Handle Location permission check on login/mount
  useEffect(() => {
    async function checkInitialLocationPermission() {
      if (Platform.OS === 'web') return;
      try {
        const { status, canAskAgain: ask } = await Location.getForegroundPermissionsAsync();
        setCanAskAgain(ask);
        
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const newLoc = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            name: 'Current Location',
            granted: true,
          };
          updateUserLocation(newLoc);
        } else if (token && userRole === 'CUSTOMER' && !userLocation.granted) {
          // If we have token, are a customer, and don't have location yet, prompt them with modal
          setShowLocationModal(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (isReady && token && userRole === 'CUSTOMER') {
      checkInitialLocationPermission();
    }
  }, [isReady, token, userRole]);

  const updateUser = async (role: string | null, tokenVal: string | null) => {
    setUserRole(role);
    setToken(tokenVal);
    try {
      if (role) {
        await AsyncStorage.setItem('chapuu_user_role', role);
      } else {
        await AsyncStorage.removeItem('chapuu_user_role');
      }
      if (tokenVal) {
        await AsyncStorage.setItem('chapuu_access_token', tokenVal);
        await AsyncStorage.setItem('chapuu_has_logged_in', 'true');
        setHasLoggedIn(true);
      } else {
        await AsyncStorage.removeItem('chapuu_access_token');
        // Clear cached state on logout
        setCart([]);
        setUserLocation({ lat: null, lng: null, name: null, granted: false });
        setActiveOrderCount(0);
        await AsyncStorage.removeItem('chapuu_cart');
        await AsyncStorage.removeItem('chapuu_location');
      }
    } catch (e) {
      // Silent error
    }
  };

  const updateCart = async (newCart: any[]) => {
    setCart(newCart);
    try {
      await AsyncStorage.setItem('chapuu_cart', JSON.stringify(newCart));
    } catch (e) {}
  };

  const updateUserLocation = async (newLoc: UserLocation) => {
    setUserLocation(newLoc);
    try {
      await AsyncStorage.setItem('chapuu_location', JSON.stringify(newLoc));
    } catch (e) {}
  };

  const updateActiveOrderCount = (count: number) => {
    setActiveOrderCount(count);
  };

  const requestLocationPermission = async () => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        updateUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          name: 'Current Location',
          granted: true,
        });
        setShowLocationModal(false);
        return;
      }

      if (!canAskAgain) {
        // Redirect to system settings
        Linking.openSettings();
        setShowLocationModal(false);
        return;
      }

      const { status, canAskAgain: ask } = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(ask);
      
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        updateUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          name: 'Current Location',
          granted: true,
        });
      } else {
        updateUserLocation({ ...userLocation, granted: false });
      }
      setShowLocationModal(false);
    } catch (error) {
      console.error(error);
      setShowLocationModal(false);
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <Image 
          source={require('../assets/favicon.png')} 
          style={{ width: 80, height: 80, resizeMode: 'contain' }} 
        />
        <ActivityIndicator size="small" color="#eab308" />
      </View>
    );
  }

  return (
    <UserContext.Provider value={{ 
      userRole, 
      token, 
      cart, 
      userLocation, 
      activeOrderCount, 
      updateUser, 
      updateCart, 
      updateUserLocation, 
      updateActiveOrderCount,
      requestLocationPermission
    }}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="more" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Premium Geolocation Request Backdrop Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.iconWrapper}>
              <Text style={styles.pinIcon}>📍</Text>
            </View>
            <Text style={styles.modalTitle}>Enable Geolocation</Text>
            <Text style={styles.modalDescription}>
              To show you nearby restaurants, shops, and ensure precise doorstep delivery, Chapuu needs access to your device location.
            </Text>

            {!canAskAgain && (
              <Text style={styles.settingsWarning}>
                Location permission was previously denied. Please click below to enable it manually in your System Settings.
              </Text>
            )}

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={requestLocationPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {!canAskAgain ? 'Open System Settings' : 'Allow Location Access'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setShowLocationModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </UserContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)', // dark-950 transparent backdrop
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#0f172a', // bg-dark-900
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(234, 179, 8, 0.1)', // Gold primary highlight
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pinIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 13,
    color: '#94a3b8', // slate-400
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  settingsWarning: {
    fontSize: 12,
    color: '#f87171', // red-400 warning
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#eab308', // Gold primary color
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#020617', // dark-950 text
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#64748b', // slate-500
    fontSize: 14,
    fontWeight: '700',
  },
});
