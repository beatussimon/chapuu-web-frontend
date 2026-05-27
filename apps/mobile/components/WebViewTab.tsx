import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Image, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../app/_layout';
import { useRouter, useNavigation } from 'expo-router';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';

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
    updateCart, 
    updateUser, 
    updateActiveOrderCount 
  } = useUser();

  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());

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

  // Sync callbacks/states to refs on every render to keep WebView handlers stable
  const tokenRef = useRef(token);
  const userRoleRef = useRef(userRole);
  const cartRef = useRef(cart);
  const userLocationRef = useRef(userLocation);
  const updateCartRef = useRef(updateCart);
  const updateUserRef = useRef(updateUser);
  const updateActiveOrderCountRef = useRef(updateActiveOrderCount);
  const onStateUpdateRef = useRef(onStateUpdate);

  useEffect(() => {
    tokenRef.current = token;
    userRoleRef.current = userRole;
    cartRef.current = cart;
    userLocationRef.current = userLocation;
    updateCartRef.current = updateCart;
    updateUserRef.current = updateUser;
    updateActiveOrderCountRef.current = updateActiveOrderCount;
    onStateUpdateRef.current = onStateUpdate;

    lastSyncedCart.current = JSON.stringify(cart);
    lastSyncedToken.current = token;
    lastSyncedRole.current = userRole;
    lastSyncedLocation.current = JSON.stringify(userLocation);
  }, [token, userRole, cart, userLocation, onStateUpdate, updateCart, updateUser, updateActiveOrderCount]);

  // Pre-load Auth and Cart state into webview localStorage before content loads.
  // We compute this ONCE on component mount to prevent changing the prop, which causes WebView to reload/flicker!
  const initialToken = useRef(token);
  const initialRole = useRef(userRole);
  const initialCart = useRef(cart);
  const initialLocation = useRef(userLocation);

  const beforeContentLoadedJS = useMemo(() => {
    const nativeToken = initialToken.current ? `'${initialToken.current}'` : 'null';
    const nativeRole = initialRole.current ? `'${initialRole.current}'` : 'null';
    const nativeCart = initialCart.current ? JSON.stringify(initialCart.current) : '[]';
    const nativeLocation = initialLocation.current ? JSON.stringify(initialLocation.current) : '{"lat":null,"lng":null,"name":null,"granted":false}';
    
    return `
      (function() {
        try {
          const nativeToken = ${nativeToken};
          const nativeRole = ${nativeRole};
          const nativeCart = ${nativeCart};
          const nativeLocation = ${nativeLocation};
          
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
                savedStores: parsedState?.state?.savedStores || []
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
      
      const hasCartChanged = cartStr !== lastSyncedCart.current;
      const hasTokenChanged = token !== lastSyncedToken.current;
      const hasRoleChanged = userRole !== lastSyncedRole.current;
      const hasLocChanged = locStr !== lastSyncedLocation.current;

      if (hasCartChanged || hasTokenChanged || hasRoleChanged || hasLocChanged) {
        lastSyncedCart.current = cartStr;
        lastSyncedToken.current = token;
        lastSyncedRole.current = userRole;
        lastSyncedLocation.current = locStr;

        const stateObj = {
          state: {
            token,
            userRole,
            cart,
            userLocation
          }
        };
        webViewRef.current.postMessage(JSON.stringify({
          type: 'STATE_SYNC',
          payload: stateObj
        }));
      }
    }
  }, [token, userRole, cart, userLocation, isFocused]);

  // Fully stable event message handler
  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'STORAGE_UPDATE') {
        const state = message.payload?.state || null;
        if (state) {
          const incomingCartStr = JSON.stringify(state.cart);
          const hasCartChanged = incomingCartStr !== lastSyncedCart.current;
          const hasTokenChanged = state.token !== lastSyncedToken.current;
          const hasRoleChanged = state.userRole !== lastSyncedRole.current;

          if (hasCartChanged && state.cart) {
            lastSyncedCart.current = incomingCartStr;
            updateCartRef.current(state.cart);
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
        
        scheduleNotificationAsync({
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

    // Intercept native URL schemes like tel:, mailto:, sms:, whatsapp:
    if (
      url.startsWith('tel:') || 
      url.startsWith('mailto:') || 
      url.startsWith('sms:') || 
      url.startsWith('whatsapp:')
    ) {
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
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webview}
        userAgent={customUserAgent}
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
});
