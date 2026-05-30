import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Image, Linking, BackHandler, Vibration, TouchableOpacity, Text, Animated, PanResponder, Keyboard } from 'react-native';
import { CustomAlert } from './CustomAlert';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import OfflineScreen from './OfflineScreen';
import { NativeState } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, LogOut } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { useRouter, useNavigation } from 'expo-router';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
let Notifications: any = null;

try {
  if (Platform.OS !== 'android' || !isExpoGo) {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.error('[ExpoNotifications] WebViewTab Load error:', e);
}

const DEFAULT_URL = 'https://chapuu.com';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

interface WebViewTabProps {
  path: string;
  onStateUpdate?: (state: Partial<NativeState> | null) => void;
}

export default function WebViewTab({ path, onStateUpdate }: WebViewTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const webViewRef = useRef<WebView>(null);
  
  // Dynamic Gold Linear Loader Animation
  const progress = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(true); // Ref so PanResponder closures always see current value
  const [showLoader, setShowLoader] = useState(true);
  const loaderOpacity = useRef(new Animated.Value(1)).current;

  // PanResponder-based pull-to-refresh: tracks drag Y on native thread
  // Works even when WebView consumes scroll touches - we capture at the container level
  const dragY = useRef(new Animated.Value(0)).current;
  const isRefreshingRef = useRef(false);

  // Map drag Y (0..120 downward) → overlay opacity (0..1) on native thread
  const dragOpacity = dragY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // PanResponder: intercept downward drags at top of page
  const panResponder = useRef(
    PanResponder.create({
      // Only capture if at top AND dragging downward
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const threshold = Platform.OS === 'ios' ? 15 : 8;
        return isAtTopRef.current && gestureState.dy > threshold && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        const threshold = Platform.OS === 'ios' ? 15 : 8;
        return isAtTopRef.current && gestureState.dy > threshold && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        Keyboard.dismiss();
        dragY.setValue(0);
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (isRefreshingRef.current) return;
        const delta = Math.max(0, gestureState.dy);
        // Apply rubber-band resistance past 60px for elastic feel
        const dampened = delta < 60 ? delta : 60 + (delta - 60) * 0.4;
        dragY.setValue(dampened);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (isRefreshingRef.current) return;
        if (gestureState.dy >= 80) {
          // Triggered — lock at full opacity and reload
          isRefreshingRef.current = true;
          Vibration.vibrate(10);
          loaderOpacity.setValue(1);
          dragY.setValue(0);
          setShowLoader(true);
          webViewRef.current?.reload();
        } else {
          // Not far enough — snap back
          Animated.timing(dragY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(dragY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

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

  // Normalize path
  const targetPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${BASE_URL}${targetPath}`;

  // React to dynamic path changes (e.g. from deep links)
  useEffect(() => {
    if (webViewRef.current && isFocused) {
      // Small timeout ensures webview is ready
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          if (window.location.href !== '${targetUrl}') {
            window.location.href = '${targetUrl}';
          }
          true;
        `);
      }, 100);
    }
  }, [targetUrl, isFocused]);

  // Resilient Safari-style linear gold progress loader trigger with opacity fading and stuck load mitigation
  useEffect(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (isLoading) {
      // 1. Loading started: make progress visible and animate to 75% width
      progress.setValue(0);
      progressOpacity.setValue(1);
      
      // Make loader overlay visible and smoothly fade it in
      setShowLoader(true);
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      Animated.timing(progress, {
        toValue: 0.75,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // 2. Stuck load mitigation fallback timeout (3.5 seconds)
      loadingTimeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(progress, {
            toValue: 1,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(progressOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(loaderOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          setShowLoader(false);
        });
      }, 3500);
    } else {
      // 3. Loading completed: shoot width to 100% and fade out in parallel
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(progressOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(loaderOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowLoader(false);
      });
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Memoize source to prevent redundant reloads on re-renders
  const source = useMemo(() => ({ uri: targetUrl }), [targetUrl]);

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
    CustomAlert.alert(
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
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
            
          const webStorage = localStorage.getItem('chapuu-storage');
          let parsedState = null;
          if (webStorage) {
            try {
              parsedState = JSON.parse(webStorage);
            } catch (e) {}
          }
          
          // The native values are directly interpolated into the JS as object literals.
          // They are already Arrays/Objects, so JSON.parse() on them would fail.
          const storageObj = {
            state: {
              token: nativeToken,
              userRole: nativeRole,
              cart: Array.isArray(nativeCart) ? nativeCart : [],
              selectedStore: parsedState?.state?.selectedStore || null,
              activeReservation: parsedState?.state?.activeReservation || null,
              userLocation: nativeLocation && typeof nativeLocation === 'object' ? nativeLocation : {lat:null,lng:null,name:null,granted:false},
              savedStores: Array.isArray(nativeSaved) ? nativeSaved : []
            },
            version: 0
          };
          localStorage.setItem('chapuu-storage', JSON.stringify(storageObj));
        } catch (e) {}
      })();
      
      (function() {
        try {
          window.addEventListener('scroll', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SCROLL_POSITION',
              payload: { y: window.scrollY }
            }));
          }, { passive: true });
        } catch (e) {}
      })();
      true;
    `;
  }, [token, userRole, cart, userLocation, savedStores]); // Ensure it injects latest state on every reload

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
      
      // We aggressively send STATE_SYNC whenever dependencies change or tab becomes focused.
      // This prevents issues where the WebView was paused/suspended in the background
      // and missed a message, causing Native to think it was synced when it wasn't.
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
      // Send message with a slight delay if waking up from background to ensure WebView engine is ready
      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'STATE_SYNC',
            payload: stateObj
          }));
        }
      }, 50);
    }
  }, [token, userRole, cart, userLocation, savedStores, isFocused]);

  // Fully stable event message handler
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
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
        updateUserRef.current('CUSTOMER', null, null); // Clears secure storage and triggers login routing guard
      } else if (message.type === 'SCROLL_POSITION') {
        const y = message.payload?.y ?? 0;
        const atTop = y <= 5;
        setIsAtTop((prev) => {
          if (prev !== atTop) {
            return atTop;
          }
          return prev;
        });
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
        
        if (Notifications) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: `Order Status Update`,
              body,
              data: { orderId },
            },
            trigger: null,
          }).catch((err: Error) => {
            console.warn('Failed to schedule local notification:', err);
          });
        }
      }
    } catch (e) {
      // Non-JSON message, ignore
    }
  }, []);

  // Fully stable request load interceptor
  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
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

  // Fully stable loader view renderer — always rendered, driven by combined opacity
  // loaderOpacity: page load events; dragOpacity: real-time drag preview (PanResponder)
  const overlayOpacity = Animated.add(loaderOpacity, dragOpacity).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderLoading = useCallback(() => (
    <Animated.View
      pointerEvents="none"
      style={[styles.loadingContainer, { opacity: overlayOpacity }]}>
      <Image 
        source={require('../assets/favicon.png')} 
        style={{ width: 80, height: 80, resizeMode: 'contain' }} 
      />
      <ActivityIndicator size="small" color="#eab308" style={{ marginTop: 24 }} />
    </Animated.View>
  ), [overlayOpacity]);

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
            {headerTitle ? (
              <Text style={styles.headerText} numberOfLines={1}>
                {headerTitle.toUpperCase()}
              </Text>
            ) : (
              <Image 
                source={require('../assets/favicon.png')} 
                style={styles.headerLogo} 
              />
            )}
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

      {/* Safari-style dynamic gold progress loading bar */}
      <Animated.View 
        style={[
          styles.progressBar, 
          { 
            width: progressWidth,
            opacity: progressOpacity
          }
        ]} 
      />

      {isOffline ? (
        <OfflineScreen onRetry={() => webViewRef.current?.reload()} />
      ) : (
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          <WebView
            ref={webViewRef}
            source={source}
            style={styles.webview}
            userAgent={customUserAgent}
            originWhitelist={['*']}
            allowsBackForwardNavigationGestures={true}
            onScroll={(event) => {
              const yOffset = event.nativeEvent.contentOffset.y;
              const atTop = yOffset <= 5;
              isAtTopRef.current = atTop;
              setIsAtTop(atTop);
            }}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              if (navState.title) {
                const cleaned = navState.title
                  .replace('Chapuu | ', '')
                  .replace(' | Chapuu', '')
                  .trim();
                if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
                  setHeaderTitle(cleaned);
                }
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            injectedJavaScriptBeforeContentLoaded={beforeContentLoadedJS}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onMessage={handleMessage}
            onLoadStart={() => {
              setIsLoading(true);
              setIsOffline(false);
            }}
            onLoadEnd={() => {
              setIsLoading(false);
              isRefreshingRef.current = false;
              // Force state sync on every reload so the web app is never out of sync
              if (webViewRef.current) {
                const cartStr = JSON.stringify(cart);
                const locStr = JSON.stringify(userLocation);
                const savedStr = JSON.stringify(savedStores);
                lastSyncedCart.current = cartStr;
                lastSyncedToken.current = token;
                lastSyncedRole.current = userRole;
                lastSyncedLocation.current = locStr;
                lastSyncedSavedStores.current = savedStr;
                webViewRef.current.postMessage(JSON.stringify({
                  type: 'STATE_SYNC',
                  payload: { state: { token, userRole, cart, userLocation, savedStores } }
                }));
              }
            }}
            onError={() => {
              setIsOffline(true);
              isRefreshingRef.current = false;
            }}
            onHttpError={() => {
              setIsOffline(true);
              isRefreshingRef.current = false;
            }}
            androidLayerType="hardware"
          />
        </View>
      )}

      {renderLoading()}
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
    ...StyleSheet.absoluteFill,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
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
  headerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#eab308',
    position: 'absolute',
    top: 56, // aligned exactly under the header
    left: 0,
    zIndex: 10,
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
