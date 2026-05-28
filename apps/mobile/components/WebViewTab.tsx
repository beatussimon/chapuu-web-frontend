import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Image, Linking, BackHandler, Vibration, TouchableOpacity, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, LogOut } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { useRouter, useNavigation } from 'expo-router';
import * as Notifications from 'expo-notifications';

const DEFAULT_URL = 'https://pasifiq.store';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

interface WebViewTabProps {
  path: string;
  onStateUpdate?: (state: any) => void;
}

export default function WebViewTab({ path, onStateUpdate }: WebViewTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const { 
    token, 
    userRole, 
    cart, 
    userLocation, 
    savedStores,
    updateCart, 
    updateUser, 
    updateSavedStores,
    updateActiveOrderCount 
  } = useUser();

  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());
  const [canGoBack, setCanGoBack] = useState(false);

  const isDiscoverTab = path === '/' || path === '/seller';
  const showBackHeader = canGoBack || !isDiscoverTab;

  // Handle native back action (haptic click + webview history pop / Discover switch)
  const handleNativeBack = useCallback(() => {
    if (webViewRef.current && canGoBack) {
      Vibration.vibrate(10);
      webViewRef.current.goBack();
    } else if (!isDiscoverTab) {
      Vibration.vibrate(10);
      router.navigate('/(tabs)'); // Switches natively to Tab 1 (Discover)
    }
  }, [canGoBack, isDiscoverTab]);

  // Android hardware back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (isFocused) {
          if (canGoBack && webViewRef.current) {
            Vibration.vibrate(10);
            webViewRef.current.goBack();
            return true; // Intercept & navigate WebView history
          } else if (!isDiscoverTab) {
            Vibration.vibrate(10);
            router.navigate('/(tabs)'); // Switch back to Discover tab natively
            return true; // Intercept
          }
        }
        return false; // Propagate (exits app)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    }
  }, [canGoBack, isFocused, isDiscoverTab]);

  // Reset WebView to default path on double-tapping bottom tab bar
  useEffect(() => {
    const handleTabPress = () => {
      if (navigation.isFocused() && webViewRef.current) {
        Vibration.vibrate(10);
        webViewRef.current.injectJavaScript(`window.location.href = '${targetUrl}';`);
      }
    };

    const unsubscribe1 = navigation.addListener('tabPress' as any, handleTabPress);
    const unsubscribe2 = navigation.getParent()?.addListener('tabPress' as any, handleTabPress);

    return () => {
      unsubscribe1();
      if (unsubscribe2) unsubscribe2();
    };
  }, [navigation, targetUrl]);

  // Handle Profile & Logout overlay buttons
  const handleProfilePress = useCallback(() => {
    if (webViewRef.current) {
      Vibration.vibrate(10);
      webViewRef.current.injectJavaScript("window.location.href = '/profile';");
    }
  }, []);

  const handleLogoutPress = useCallback(() => {
    Vibration.vibrate(10);
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out of Chapuu?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            Vibration.vibrate(15);
            updateUser(null, null); // Triggers native logout cleaning
          }
        }
      ]
    );
  }, [updateUser]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsFocused(false);
    });

    setIsFocused(navigation.isFocused());

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  const router = useRouter();

  // Normalize path
  const targetPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${BASE_URL}${targetPath}`;

  // Memoize source to prevent redundant reloads on re-renders
  const source = useMemo(() => ({ uri: targetUrl }), [targetUrl]);

  // Custom User-Agent to let the web frontend synchronously hide its web navigation bar
  const customUserAgent = useMemo(() => {
    return Platform.OS === 'ios'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ChapuuMobile'
      : 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 ChapuuMobile';
  }, []);

  // Sync tracking refs immediately to bypass React rendering lag loops
  const lastSyncedCart = useRef(JSON.stringify(cart));
  const lastSyncedToken = useRef(token);
  const lastSyncedRole = useRef(userRole);
  const lastSyncedLocation = useRef(JSON.stringify(userLocation));
  const lastSyncedSavedStores = useRef(JSON.stringify(savedStores));

  // Sync callbacks/states to refs on every render to keep WebView handlers stable
  const tokenRef = useRef(token);
  const userRoleRef = useRef(userRole);
  const cartRef = useRef(cart);
  const userLocationRef = useRef(userLocation);
  const updateCartRef = useRef(updateCart);
  const updateUserRef = useRef(updateUser);
  const updateSavedStoresRef = useRef(updateSavedStores);
  const updateActiveOrderCountRef = useRef(updateActiveOrderCount);
  const onStateUpdateRef = useRef(onStateUpdate);

  useEffect(() => {
    tokenRef.current = token;
    userRoleRef.current = userRole;
    cartRef.current = cart;
    userLocationRef.current = userLocation;
    updateCartRef.current = updateCart;
    updateUserRef.current = updateUser;
    updateSavedStoresRef.current = updateSavedStores;
    updateActiveOrderCountRef.current = updateActiveOrderCount;
    onStateUpdateRef.current = onStateUpdate;

    lastSyncedCart.current = JSON.stringify(cart);
    lastSyncedToken.current = token;
    lastSyncedRole.current = userRole;
    lastSyncedLocation.current = JSON.stringify(userLocation);
    lastSyncedSavedStores.current = JSON.stringify(savedStores);
  }, [token, userRole, cart, userLocation, savedStores, onStateUpdate, updateCart, updateUser, updateSavedStores, updateActiveOrderCount]);

  // Pre-load Auth and Cart state into webview localStorage before content loads.
  // We compute this ONCE on component mount to prevent changing the prop, which causes WebView to reload/flicker!
  const initialToken = useRef(token);
  const initialRole = useRef(userRole);
  const initialCart = useRef(cart);
  const initialLocation = useRef(userLocation);
  const initialSavedStores = useRef(savedStores);

  const beforeContentLoadedJS = useMemo(() => {
    const nativeToken = initialToken.current ? `'${initialToken.current}'` : 'null';
    const nativeRole = initialRole.current ? `'${initialRole.current}'` : 'null';
    const nativeCart = initialCart.current ? JSON.stringify(initialCart.current) : '[]';
    const nativeLocation = initialLocation.current ? JSON.stringify(initialLocation.current) : '{"lat":null,"lng":null,"name":null,"granted":false}';
    const nativeSaved = initialSavedStores.current ? JSON.stringify(initialSavedStores.current) : '[]';
    
    return `
      (function() {
        try {
          const nativeToken = ${nativeToken};
          const nativeRole = ${nativeRole};
          const nativeCart = ${nativeCart};
          const nativeLocation = ${nativeLocation};
          const nativeSaved = ${nativeSaved};
          
          if (nativeToken) {
            localStorage.setItem('access_token', nativeToken);
            
            const webStorage = localStorage.getItem('chapuu-storage');
            let parsedState = null;
            if (webStorage) {
              try {
                parsedState = JSON.parse(webStorage);
              } catch (e) {}
            }
            
            const storageObj = {
              state: {
                token: nativeToken,
                userRole: nativeRole,
                cart: nativeCart,
                selectedStore: parsedState?.state?.selectedStore || null,
                activeReservation: parsedState?.state?.activeReservation || null,
                userLocation: nativeLocation,
                savedStores: nativeSaved
              },
              version: 0
            };
            localStorage.setItem('chapuu-storage', JSON.stringify(storageObj));
          } else {
            localStorage.removeItem('chapuu-storage');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (e) {}
      })();
      true;
    `;
  }, []); // Empty dependency array -> stable for the entire lifecycle of the WebView component

  // Synchronize native focus state back to WebView
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'FOCUS_CHANGE',
        payload: { isFocused }
      }));
    }
  }, [isFocused]);

  // Broadcast state changes dynamically to already mounted WebViews with strict deduplication
  useEffect(() => {
    if (webViewRef.current && isFocused) {
      const cartStr = JSON.stringify(cart);
      const locStr = JSON.stringify(userLocation);
      const savedStr = JSON.stringify(savedStores);
      
      const hasCartChanged = cartStr !== lastSyncedCart.current;
      const hasTokenChanged = token !== lastSyncedToken.current;
      const hasRoleChanged = userRole !== lastSyncedRole.current;
      const hasLocChanged = locStr !== lastSyncedLocation.current;
      const hasSavedChanged = savedStr !== lastSyncedSavedStores.current;

      if (hasCartChanged || hasTokenChanged || hasRoleChanged || hasLocChanged || hasSavedChanged) {
        lastSyncedCart.current = cartStr;
        lastSyncedToken.current = token;
        lastSyncedRole.current = userRole;
        lastSyncedLocation.current = locStr;
        lastSyncedSavedStores.current = savedStr;

        const stateObj = {
          state: {
            token,
            userRole,
            cart,
            userLocation,
            savedStores
          }
        };
        webViewRef.current.postMessage(JSON.stringify({
          type: 'STATE_SYNC',
          payload: stateObj
        }));
      }
    }
  }, [token, userRole, cart, userLocation, savedStores, isFocused]);

  // Fully stable event message handler
  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'STORAGE_UPDATE') {
        const state = message.payload?.state || null;
        if (state) {
          const incomingCartStr = JSON.stringify(state.cart);
          const incomingSavedStr = JSON.stringify(state.savedStores);
          const hasCartChanged = incomingCartStr !== lastSyncedCart.current;
          const hasSavedChanged = incomingSavedStr !== lastSyncedSavedStores.current;
          const hasTokenChanged = state.token !== lastSyncedToken.current;
          const hasRoleChanged = state.userRole !== lastSyncedRole.current;

          if (hasCartChanged && state.cart) {
            lastSyncedCart.current = incomingCartStr;
            updateCartRef.current(state.cart);
          }
          if (hasSavedChanged && state.savedStores) {
            lastSyncedSavedStores.current = incomingSavedStr;
            updateSavedStoresRef.current(state.savedStores);
          }
          if ((hasTokenChanged || hasRoleChanged) && onStateUpdateRef.current) {
            if (hasTokenChanged) lastSyncedToken.current = state.token;
            if (hasRoleChanged) lastSyncedRole.current = state.userRole;
            onStateUpdateRef.current(state);
          }
        } else if (onStateUpdateRef.current) {
          onStateUpdateRef.current(null);
        }
      } else if (message.type === 'ACTIVE_ORDERS_COUNT') {
        updateActiveOrderCountRef.current(message.payload?.count || 0);
      } else if (message.type === 'UNAUTHORIZED') {
        updateUserRef.current('CUSTOMER', null); // Clears storage and triggers login routing guard
      } else if (message.type === 'ORDER_STATUS_NOTIFICATION') {
        const { orderId, state, storeName, fulfillmentMode } = message.payload;
        
        let body = `Order #${orderId} has been updated to ${state.replace('_', ' ')}.`;
        if (state === 'PREPARING') {
          body = `Your order from ${storeName} is now being prepared in the kitchen!`;
        } else if (state === 'READY') {
          if (fulfillmentMode === 'DELIVERY') {
            body = `Your order from ${storeName} is ready and waiting for dispatch!`;
          } else {
            body = `Your order from ${storeName} is ready for pickup!`;
          }
        } else if (state === 'OUT_FOR_DELIVERY') {
          body = `Your order from ${storeName} is out for delivery! The rider is on their way.`;
        } else if (state === 'COMPLETED') {
          body = `Your order from ${storeName} is complete. Enjoy your meal!`;
        } else if (state === 'CANCELLED') {
          body = `Your order from ${storeName} has been cancelled.`;
        }
        
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Order Status Update`,
            body,
            data: { orderId },
          },
          trigger: null,
        }).catch((err: any) => {
          console.warn('Failed to schedule local notification:', err);
        });
      }
    } catch (e) {
      // Non-JSON message, ignore
    }
  }, []);

  // Fully stable request load interceptor
  const handleShouldStartLoadWithRequest = useCallback((request: any) => {
    const { url } = request;

    // 1. Intercept custom URL schemes like tel:, mailto:, sms:, whatsapp:
    const isCustomScheme = 
      url.startsWith('tel:') || 
      url.startsWith('mailto:') || 
      url.startsWith('sms:') || 
      url.startsWith('whatsapp:');

    // 2. Intercept web-based contact links (like wa.me, api.whatsapp.com)
    const isWhatsAppWeb = url.includes('wa.me') || url.includes('api.whatsapp.com');

    // 3. Intercept external web URLs that don't belong in the app's internal navigation
    const isWebUrl = url.startsWith('http://') || url.startsWith('https://');
    const isExternalWebUrl = isWebUrl && !url.startsWith(BASE_URL);

    if (isCustomScheme || isWhatsAppWeb || isExternalWebUrl) {
      Linking.openURL(url).catch((err) => console.warn('Failed to open URL natively:', err));
      return false; // Stop WebView from attempting to load this URL
    }

    if (!url.startsWith(BASE_URL)) return true;

    // Parse pathname
    let pathname = '/';
    let search = '';
    try {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
      search = urlObj.search;
    } catch (e) {
      return true;
    }

    const tabMapping: Record<string, string> = {};
    const role = userRoleRef.current;
    if (role === 'CUSTOMER') {
      tabMapping['/'] = '/(tabs)';
      tabMapping['/stores'] = '/(tabs)/tab2';
      tabMapping['/cart'] = '/(tabs)/tab3';
      tabMapping['/orders'] = '/(tabs)/tab4';
      tabMapping['/reserve'] = '/(tabs)/tab5';
    } else if (['SELLER', 'ADMIN', 'SUPERUSER'].includes(role || '')) {
      tabMapping['/seller'] = '/(tabs)';
      tabMapping['/seller/menu'] = '/(tabs)/tab2';
      tabMapping['/seller/analytics'] = '/(tabs)/tab3';
      tabMapping['/seller/inventory'] = '/(tabs)/tab4';
    }

    const currentTabPath = path.startsWith('/') ? path : `/${path}`;
    const currentTabPathname = currentTabPath.split('?')[0];

    // Intercept redirect if navigating to a different Tab route natively
    if (tabMapping[pathname] && pathname !== currentTabPathname) {
      router.navigate(tabMapping[pathname] as any);
      return false; // Stop internal webview redirect
    }

    return true;
  }, [path]);

  // Fully stable loader view renderer
  const renderLoading = useCallback(() => (
    <View style={styles.loadingContainer}>
      <Image 
        source={require('../assets/favicon.png')} 
        style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 24 }} 
      />
      <ActivityIndicator size="small" color="#eab308" />
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {showBackHeader ? (
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleNativeBack}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <ArrowLeft size={22} color="#eab308" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Image 
              source={require('../assets/favicon.png')} 
              style={styles.headerLogo} 
            />
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      ) : (
        /* Branded Root Tab Header with Profile & Logout Actions */
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>CHAPUU</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={handleProfilePress}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <User size={20} color="#eab308" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={handleLogoutPress}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <LogOut size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webview}
        userAgent={customUserAgent}
        originWhitelist={['*']}
        allowsBackForwardNavigationGestures={true}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        injectedJavaScriptBeforeContentLoaded={beforeContentLoadedJS}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleMessage}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={renderLoading}
        androidLayerType="hardware"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // Matching dark-950 color
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
    opacity: 0.99,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  headerPlaceholder: {
    width: 40,
  },
  headerLeft: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#eab308',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerIconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
