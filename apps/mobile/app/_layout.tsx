import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { 
  View, 
  ActivityIndicator, 
  StatusBar,
  Modal, 
  Text, 
  StyleSheet, 
  Platform,
  Image,
  Animated,
  AppState,
  AppStateStatus
} from 'react-native';
import * as Location from 'expo-location';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { UserContext, UserContextType, UserLocation } from '../context/UserContext';
import { CartItem } from '../types';
import CustomAlertModal from '../components/CustomAlert';
import ScalePressable from '../components/ScalePressable';
import { isTokenNearExpiry, silentlyRefreshToken } from '../services/tokenRefresh';
import apiClient from '../services/api';
import { authEmitter } from '../services/authEmitter';
import { KeyboardProvider } from 'react-native-keyboard-controller';
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
let Notifications: any = null;

// Safe loading of notifications - Android Expo Go (SDK 53+) does not support remote notifications
try {
  if (Platform.OS !== 'android' || !isExpoGo) {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.error('[ExpoNotifications] Load error:', e);
}

// Configure notification behavior safely
try {
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.warn('Failed to set notification handler:', e);
}

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  console.log('[RootLayout] Mounting...');
  const [userRole, setUserRole] = useState<string | null>('CUSTOMER');
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    lat: null,
    lng: null,
    name: null,
    granted: false,
  });
  const [savedStores, setSavedStores] = useState<number[]>([]);
  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);
  const [pendingDeepLinkPath, setPendingDeepLinkPath] = useState<string | null>(null);
  const [activeReservation, setActiveReservation] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);

  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  const segments = useSegments();
  const router = useRouter();

  // Load cached role/token/cart/location/savedStores on mount
  useEffect(() => {
    console.log('[RootLayout] Loading cached data...');
    async function loadCachedData() {
      try {
        const cachedRole = await AsyncStorage.getItem('chapuu_user_role');
        const cachedCart = await AsyncStorage.getItem('chapuu_cart');
        const cachedLoc = await AsyncStorage.getItem('chapuu_location');
        const cachedSaved = await AsyncStorage.getItem('chapuu_saved_stores');
        const cachedHasLoggedIn = await AsyncStorage.getItem('chapuu_has_logged_in');

        // SECURE STORE MIGRATION: Check if access token is in AsyncStorage
        const oldToken = await AsyncStorage.getItem('chapuu_access_token');
        if (oldToken) {
          console.log('[RootLayout] Migrating token to SecureStore...');
          await SecureStore.setItemAsync('chapuu_access_token', oldToken);
          await AsyncStorage.removeItem('chapuu_access_token');
        }

        const secureToken = await SecureStore.getItemAsync('chapuu_access_token');
        const secureRefreshToken = await SecureStore.getItemAsync('chapuu_refresh_token');

        console.log('[RootLayout] Cache loaded:', { hasToken: !!secureToken, role: cachedRole });

        if (cachedRole) setUserRole(cachedRole);
        if (secureToken) setToken(secureToken);
        if (secureRefreshToken) setRefreshToken(secureRefreshToken);
        if (cachedCart) setCart(JSON.parse(cachedCart));
        if (cachedLoc) setUserLocation(JSON.parse(cachedLoc));
        if (cachedSaved) setSavedStores(JSON.parse(cachedSaved));
        if (cachedHasLoggedIn === 'true') setHasLoggedIn(true);
      } catch (e) {
        console.error('[RootLayout] Cache load error:', e);
      } finally {
        setIsReady(true);
        console.log('[RootLayout] Ready.');
      }
    }
    loadCachedData();
  }, []);

  // Auth routing guard redirect
  useEffect(() => {
    if (!isReady) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'onboarding' || currentSegment === 'login' || currentSegment === 'signup';

    console.log('[RootLayout] Guard check:', { currentSegment, hasToken: !!token });

    if (!token) {
      if (hasLoggedIn && currentSegment === 'onboarding') {
        console.log('[RootLayout] Redirecting to login');
        router.replace('/login');
      } else if (!inAuthGroup) {
        if (hasLoggedIn) {
          console.log('[RootLayout] Redirecting to login (not in auth group)');
          router.replace('/login');
        } else {
          console.log('[RootLayout] Redirecting to onboarding');
          router.replace('/onboarding');
        }
      }
    } else {
      if (inAuthGroup) {
        console.log('[RootLayout] Redirecting to tabs');
        router.replace('/(tabs)');
      }
    }
  }, [token, segments, isReady, hasLoggedIn]);

  // Global Auth Emitter for 401 Unauthorized handling
  useEffect(() => {
    const unsubscribe = authEmitter.subscribe(() => {
      console.log('[RootLayout] 401 Unauthorized detected. Purging session...');
      updateUser('CUSTOMER', null, null);
    });
    return unsubscribe;
  }, [updateUser]);

  // Handle push notification taps
  useEffect(() => {
    if (!Notifications) return;

    const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      if (data?.orderId) {
        console.log('[RootLayout] Push notification tapped for order:', data.orderId);
        setPendingDeepLinkPath(`/order/track/${data.orderId}`);
        router.replace('/(tabs)/tab4');
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Handle Expo Deep Links
  useEffect(() => {
    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      try {
        const parsedUrl = Linking.parse(url);
        console.log('[RootLayout] Deep link received:', parsedUrl);
        const path = parsedUrl.path;
        if (path) {
          const queryParams = parsedUrl.queryParams;
          let webPath = `/${path}`;
          if (queryParams && Object.keys(queryParams).length > 0) {
            const queryStr = Object.keys(queryParams)
              .map(k => `${k}=${encodeURIComponent(queryParams[k] as string)}`)
              .join('&');
            webPath += `?${queryStr}`;
          }

          console.log('[RootLayout] Routing to deep link path:', webPath);
          setPendingDeepLinkPath(webPath);
          
          // Map to specific tabs
          if (path.startsWith('order/track')) {
            router.replace('/(tabs)/tab4');
          } else if (path.startsWith('menu')) {
            router.replace('/(tabs)/');
          } else if (path.startsWith('reserve')) {
            router.replace('/(tabs)/tab5');
          } else if (path.startsWith('stores')) {
            router.replace('/(tabs)/tab2');
          } else {
            router.replace('/(tabs)/');
          }
        }
      } catch (e) {
        console.warn('[RootLayout] Failed to parse deep link:', e);
      }
    };

    // Check initial URL
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    // Listen to incoming URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Splash screen transition settlement observer
  useEffect(() => {
    if (!isReady) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'onboarding' || currentSegment === 'login' || currentSegment === 'signup';

    console.log('[RootLayout] Splash check:', { currentSegment, hasToken: !!token, hasLoggedIn, showSplash });

    // Determine if navigation has settled on the correct target path
    let isSettled = false;
    if (token) {
      isSettled = currentSegment === '(tabs)';
    } else {
      if (hasLoggedIn) {
        // Returning logged-out user - must settle on login or signup, onboarding is NOT a settled target
        isSettled = currentSegment === 'login' || currentSegment === 'signup';
      } else {
        // New user - settles on onboarding, login, or signup
        isSettled = currentSegment === 'onboarding' || currentSegment === 'login' || currentSegment === 'signup';
      }
    }

    if (isSettled && showSplash) {
      console.log('[RootLayout] Navigation settled. Fading out splash...');
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
        console.log('[RootLayout] Splash hidden.');
      });
    }
  }, [isReady, token, segments, showSplash, hasLoggedIn]);

  // Request notifications permission on login
  useEffect(() => {
    async function registerForPushNotifications() {
      if (Platform.OS === 'web' || !Notifications) return;

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
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

  // Silent Token Refresh on App Foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && token && refreshToken) {
        if (isTokenNearExpiry(token)) {
          console.log('[RootLayout] Token near expiry on foreground, refreshing silently...');
          const newAccess = await silentlyRefreshToken(refreshToken);
          if (newAccess) {
            updateUser(userRole, newAccess, refreshToken);
          } else {
            // If refresh fails (refresh token expired), we should let the API calls 401 and WebView will trigger UNAUTHORIZED message to log them out
            console.log('[RootLayout] Silent refresh failed, relying on 401 interceptor.');
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [token, refreshToken, userRole]);
  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get('/auth/users/me/');
      if (res.data) {
        setProfileData(res.data);
        setLoyaltyPoints(res.data.loyalty_points || 0);
      }
    } catch (e) {
      console.warn('[RootLayout] Failed to fetch profile:', e);
    }
  };

  useEffect(() => {
    if (token) fetchUserProfile();
  }, [token]);

  async function updateUser(role: string | null, tokenVal: string | null, refreshVal?: string | null) {
    setUserRole(role);
    setToken(tokenVal);
    if (refreshVal !== undefined) {
      setRefreshToken(refreshVal);
    }
    if (!tokenVal) {
      setProfileData(null);
      setLoyaltyPoints(0);
    }
    try {
      if (role) {
        await AsyncStorage.setItem('chapuu_user_role', role);
      } else {
        await AsyncStorage.removeItem('chapuu_user_role');
      }
      if (tokenVal) {
        await SecureStore.setItemAsync('chapuu_access_token', tokenVal);
        await AsyncStorage.setItem('chapuu_has_logged_in', 'true');
        setHasLoggedIn(true);
      } else {
        await SecureStore.deleteItemAsync('chapuu_access_token');
        // Clear cached state on logout
        setCart([]);
        setUserLocation({ lat: null, lng: null, name: null, granted: false });
        setSavedStores([]);
        setActiveOrderCount(0);
        await AsyncStorage.removeItem('chapuu_cart');
        await AsyncStorage.removeItem('chapuu_location');
        await AsyncStorage.removeItem('chapuu_saved_stores');
      }

      if (refreshVal) {
        await SecureStore.setItemAsync('chapuu_refresh_token', refreshVal);
      } else if (refreshVal === null) {
        await SecureStore.deleteItemAsync('chapuu_refresh_token');
      }
    } catch (e) {
      console.warn('[_layout.tsx] updateUser failed:', e);
    }
  };

  const updateCart = async (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      await AsyncStorage.setItem('chapuu_cart', JSON.stringify(newCart));
    } catch (e) {
      console.warn('[_layout.tsx] updateCart failed:', e);
    }
  };

  const updateUserLocation = async (newLoc: UserLocation) => {
    setUserLocation(newLoc);
    try {
      await AsyncStorage.setItem('chapuu_location', JSON.stringify(newLoc));
    } catch (e) {
      console.warn('[_layout.tsx] updateUserLocation failed:', e);
    }
  };

  const updateSavedStores = async (newStores: number[]) => {
    setSavedStores(newStores);
    try {
      await AsyncStorage.setItem('chapuu_saved_stores', JSON.stringify(newStores));
    } catch (e) {
      console.warn('[_layout.tsx] updateSavedStores failed:', e);
    }
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

  return (
    <KeyboardProvider>
      <UserContext.Provider value={{ 
        userRole, 
      token, 
      refreshToken,
      profileData,
      loyaltyPoints,
      cart, 
      userLocation, 
      savedStores,
      activeOrderCount, 
      pendingDeepLinkPath,
      activeReservation,
      updateUser, 
      updateCart, 
      updateUserLocation, 
      updateSavedStores,
      updateActiveOrderCount,
      setPendingDeepLinkPath,
      setActiveReservation,
      requestLocationPermission,
      fetchUserProfile
    }}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        {token ? <Stack.Screen name="(tabs)" /> : null}
        {token ? <Stack.Screen name="more" options={{ presentation: 'modal' }} /> : null}
        {!token ? <Stack.Screen name="onboarding" /> : null}
        {!token ? <Stack.Screen name="login" /> : null}
        {!token ? <Stack.Screen name="signup" /> : null}
      </Stack>

      <CustomAlertModal />

      {/* Premium Animated Splash Overlay for absolutely zero flash layout transition */}
      {showSplash && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              opacity: splashOpacity, 
              backgroundColor: '#020617', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 24,
              zIndex: 9999
            }
          ]}
          pointerEvents={isReady ? 'none' : 'auto'}
        >
          <Image 
            source={require('../assets/favicon.png')} 
            style={{ width: 80, height: 80, resizeMode: 'contain' }} 
          />
          <ActivityIndicator size="small" color="#eab308" />
        </Animated.View>
      )}

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

            <ScalePressable 
              style={styles.primaryButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.primaryButtonText}>
                {!canAskAgain ? 'Open System Settings' : 'Allow Location Access'}
              </Text>
            </ScalePressable>

            <ScalePressable 
              style={styles.secondaryButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </ScalePressable>
          </View>
        </View>
      </Modal>
    </UserContext.Provider>
    </KeyboardProvider>
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
