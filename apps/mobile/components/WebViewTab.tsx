import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Image, Linking, BackHandler, Vibration, Text, Animated, Keyboard } from 'react-native';
import ScalePressable, { ScaleIconButton } from './ScalePressable';
import { CustomAlert } from './CustomAlert';
import { WebView } from 'react-native-webview';
import OfflineScreen from './OfflineScreen';
import { NativeState } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, LogOut } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { useRouter, useNavigation } from 'expo-router';
import OptimizedImage from './OptimizedImage';

// Custom Hooks
import { useWebViewBridge } from '../hooks/useWebViewBridge';
import { useWebViewGestures } from '../hooks/useWebViewGestures';
import { useWebViewRouting } from '../hooks/useWebViewRouting';

const DEFAULT_URL = 'https://chapuu.com';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

interface WebViewTabProps {
  path: string;
  onStateUpdate?: (state: Partial<NativeState> | null) => void;
}

export default function WebViewTab({ path, onStateUpdate }: WebViewTabProps) {
  const { updateUser, setPendingDeepLinkPath, userRole, token, cart, userLocation, savedStores, profileData } = useUser();
  const router = useRouter();
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const [isFocused, setIsFocused] = useState(navigation.isFocused());
  const [canGoBack, setCanGoBack] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  
  // Dynamic Gold Linear Loader Animation
  const progress = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(true); 
  const [showLoader, setShowLoader] = useState(true);
  const loaderOpacity = useRef(new Animated.Value(1)).current;

  // Custom Hooks Composition
  const { panResponder, dragOpacity, isRefreshingRef } = useWebViewGestures(isAtTopRef, webViewRef, setShowLoader, loaderOpacity);
  const { handleMessage } = useWebViewBridge(isFocused, webViewRef, onStateUpdate);
  const { handleShouldStartLoadWithRequest } = useWebViewRouting(BASE_URL, path, userRole, setPendingDeepLinkPath);

  const isDiscoverTab = path === '/' || path === '/seller';
  const showBackHeader = canGoBack || !isDiscoverTab;

  const targetPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  const source = useMemo(() => ({ uri: targetUrl }), [targetUrl]);

  // Load URL changes
  useEffect(() => {
    if (webViewRef.current && isFocused) {
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

  // Loader Animation
  useEffect(() => {
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    if (isLoading) {
      progress.setValue(0);
      progressOpacity.setValue(1);
      setShowLoader(true);
      Animated.timing(loaderOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      Animated.timing(progress, { toValue: 0.75, duration: 1500, useNativeDriver: false }).start();

      loadingTimeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(progress, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(progressOpacity, { toValue: 0, duration: 300, useNativeDriver: false }),
          Animated.timing(loaderOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
        ]).start(() => setShowLoader(false));
      }, 5000); 
    } else {
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(progressOpacity, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.timing(loaderOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => setShowLoader(false));
    }

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [isLoading]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Navigation handlers
  const handleNativeBack = useCallback(() => {
    if (webViewRef.current && canGoBack) {
      Vibration.vibrate(10);
      webViewRef.current.goBack();
    } else if (!isDiscoverTab) {
      Vibration.vibrate(10);
      router.navigate('/(tabs)'); 
    }
  }, [canGoBack, isDiscoverTab]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (isFocused) {
          if (canGoBack && webViewRef.current) {
            Vibration.vibrate(10);
            webViewRef.current.goBack();
            return true; 
          } else if (!isDiscoverTab) {
            Vibration.vibrate(10);
            router.navigate('/(tabs)');
            return true;
          }
        }
        return false; 
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack, isFocused, isDiscoverTab]);

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
            updateUser('CUSTOMER', null, null); 
          }
        }
      ]
    );
  }, [updateUser]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => setIsFocused(true));
    const unsubscribeBlur = navigation.addListener('blur', () => setIsFocused(false));
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  const customUserAgent = 'ChapuuMobile/1.0.0';

  const beforeContentLoadedJS = useMemo(() => {
    const nativeToken = token ? `'${token}'` : 'null';
    const nativeRole = userRole ? `'${userRole}'` : 'null';
    const nativeCart = cart ? JSON.stringify(cart) : '[]';
    const nativeLocation = userLocation ? JSON.stringify(userLocation) : '{"lat":null,"lng":null,"name":null,"granted":false}';
    const nativeSaved = savedStores ? JSON.stringify(savedStores) : '[]';
    
    return `
      (function() {
        try {
          const nativeToken = ${nativeToken};
          if (nativeToken) {
            localStorage.setItem('access_token', nativeToken);
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
          
          const storageState = localStorage.getItem('chapuu-storage');
          const parsedState = storageState ? JSON.parse(storageState) : null;
          
          const storageObj = {
            state: {
              token: nativeToken,
              userRole: ${nativeRole},
              cart: ${nativeCart},
              selectedStore: parsedState?.state?.selectedStore || null,
              activeReservation: parsedState?.state?.activeReservation || null,
              userLocation: ${nativeLocation},
              savedStores: ${nativeSaved}
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
  }, [token, userRole, cart, userLocation, savedStores]);

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'FOCUS_CHANGE', payload: { isFocused } }));
    }
  }, [isFocused]);

  const overlayOpacity = Animated.add(loaderOpacity, dragOpacity).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {showBackHeader ? (
        <View style={styles.header}>
          <ScaleIconButton 
            style={styles.backButton} 
            onPress={handleNativeBack}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <ArrowLeft size={22} color="#eab308" />
          </ScaleIconButton>
          <View style={styles.headerTitleContainer}>
            {headerTitle ? (
              <Text style={styles.headerText} numberOfLines={1}>
                {headerTitle.toUpperCase()}
              </Text>
            ) : (
              <Image source={require('../assets/favicon.png')} style={styles.headerLogo} />
            )}
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>CHAPUU</Text>
          </View>
          <View style={styles.headerRight}>
            <ScaleIconButton 
              style={styles.headerIconButton} 
              onPress={handleProfilePress}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              {profileData?.profile_picture ? (
                <OptimizedImage src={profileData.profile_picture} wrapperStyle={styles.headerAvatar} style={styles.headerAvatar} placeholderType="profile" />
              ) : (
                <User size={20} color="#eab308" />
              )}
            </ScaleIconButton>
            <ScaleIconButton 
              style={styles.headerIconButton} 
              onPress={handleLogoutPress}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <LogOut size={20} color="#94a3b8" />
            </ScaleIconButton>
          </View>
        </View>
      )}

      <Animated.View style={[styles.progressBar, { width: progressWidth, opacity: progressOpacity }]} />

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
                const cleaned = navState.title.replace('Chapuu | ', '').replace(' | Chapuu', '').trim();
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
            onMessage={(e) => handleMessage(e, setIsAtTop)}
            onLoadStart={() => {
              setIsLoading(true);
              setIsOffline(false);
            }}
            onLoadEnd={() => {
              setIsLoading(false);
              isRefreshingRef.current = false;
            }}
            onRenderProcessGone={() => {
              webViewRef.current?.reload();
            }}
            onError={() => {
              setIsOffline(true);
              setIsLoading(false);
            }}
          />
          {showLoader && (
            <Animated.View pointerEvents="none" style={[styles.loadingContainer, { opacity: overlayOpacity }]}>
              <Image source={require('../assets/favicon.png')} style={{ width: 80, height: 80, resizeMode: 'contain' }} />
              <ActivityIndicator size="small" color="#eab308" style={{ marginTop: 24 }} />
            </Animated.View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: 20, backgroundColor: '#020617', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  headerLogo: { width: 32, height: 32, resizeMode: 'contain' },
  headerPlaceholder: { width: 40 },
  headerLeft: { flex: 1, justifyContent: 'center' },
  brandText: { color: '#ffffff', fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  headerAvatar: { width: 24, height: 24, borderRadius: 12 },
  progressBar: { position: 'absolute', top: 60, height: 2, backgroundColor: '#eab308', zIndex: 100 },
  webview: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { ...StyleSheet.absoluteFill, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
});
