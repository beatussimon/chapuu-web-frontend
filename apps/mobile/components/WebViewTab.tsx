import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../app/_layout';
import { useIsFocused, useRouter } from 'expo-router';
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
    updateCart, 
    updateUser, 
    updateActiveOrderCount 
  } = useUser();
  const isFocused = useIsFocused();
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

  // Pre-load Auth and Cart state into webview localStorage before content loads
  const beforeContentLoadedJS = useMemo(() => {
    const nativeToken = token ? `'${token}'` : 'null';
    const nativeRole = userRole ? `'${userRole}'` : 'null';
    const nativeCart = cart ? JSON.stringify(cart) : '[]';
    const nativeLocation = userLocation ? JSON.stringify(userLocation) : '{"lat":null,"lng":null,"name":null,"granted":false}';
    
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
  }, [token, userRole, cart, userLocation]);

  // Synchronize native focus state back to WebView
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'FOCUS_CHANGE',
        payload: { isFocused }
      }));
    }
  }, [isFocused]);

  // Broadcast state changes dynamically to already mounted WebViews
  useEffect(() => {
    if (webViewRef.current && isFocused) {
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
  }, [token, userRole, cart, userLocation, isFocused]);

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'STORAGE_UPDATE') {
        const state = message.payload?.state || null;
        if (state) {
          if (state.cart) updateCart(state.cart);
          if (onStateUpdate) onStateUpdate(state);
        } else if (onStateUpdate) {
          onStateUpdate(null);
        }
      } else if (message.type === 'ACTIVE_ORDERS_COUNT') {
        updateActiveOrderCount(message.payload?.count || 0);
      } else if (message.type === 'UNAUTHORIZED') {
        updateUser('CUSTOMER', null); // Clears storage and triggers login routing guard
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
        });
      }
    } catch (e) {
      // Non-JSON message, ignore
    }
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
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
    if (userRole === 'CUSTOMER') {
      tabMapping['/'] = '/(tabs)';
      tabMapping['/stores'] = '/(tabs)/tab2';
      tabMapping['/cart'] = '/(tabs)/tab3';
      tabMapping['/orders'] = '/(tabs)/tab4';
      tabMapping['/reserve'] = '/(tabs)/tab5';
    } else if (['SELLER', 'ADMIN', 'SUPERUSER'].includes(userRole || '')) {
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
  };

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
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#eab308" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // Matching dark-950 color
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
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
