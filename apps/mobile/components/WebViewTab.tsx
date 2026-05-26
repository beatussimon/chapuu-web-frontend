import React, { useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useUser } from '../app/_layout';

const DEFAULT_URL = 'https://pasifiq.store';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

interface WebViewTabProps {
  path: string;
  onStateUpdate?: (state: any) => void;
}

export default function WebViewTab({ path, onStateUpdate }: WebViewTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const { token, userRole } = useUser();

  // Normalize path
  const targetPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${BASE_URL}${targetPath}`;

  // Custom User-Agent to let the web frontend synchronously hide its web navigation bar
  const customUserAgent = Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ChapuuMobile'
    : 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 ChapuuMobile';

  // JavaScript injected to sync state (Native -> Web) and report changes back (Web -> Native)
  const injectBridgeJS = `
    (function() {
      // 1. Sync State: Native -> Web
      try {
        const nativeToken = ${token ? `'${token}'` : 'null'};
        const nativeRole = ${userRole ? `'${userRole}'` : 'null'};
        const webStorage = localStorage.getItem('chapuu-storage');
        let webToken = null;
        if (webStorage) {
          try {
            webToken = JSON.parse(webStorage).state.token;
          } catch(e) {}
        }
        
        if (nativeToken && webToken !== nativeToken) {
          const storageObj = {
            state: {
              token: nativeToken,
              userRole: nativeRole,
              cart: [],
              selectedStore: null,
              activeReservation: null,
              userLocation: { lat: null, lng: null, name: null, granted: false },
              savedStores: []
            },
            version: 0
          };
          localStorage.setItem('chapuu-storage', JSON.stringify(storageObj));
          localStorage.setItem('access_token', nativeToken);
          // Force reload to apply Zustand store initialization from storage
          window.location.reload();
          return;
        } else if (!nativeToken && webToken) {
          // Sync logout
          localStorage.removeItem('chapuu-storage');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.reload();
          return;
        }
      } catch (e) {
        // Silent catch
      }

      // 2. State Bridge: Web -> Native
      let lastStateStr = "";
      function checkStorage() {
        try {
          const data = localStorage.getItem('chapuu-storage');
          if (data && data !== lastStateStr) {
            lastStateStr = data;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STORAGE_UPDATE',
              payload: JSON.parse(data)
            }));
          } else if (!data && lastStateStr !== "null") {
            lastStateStr = "null";
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STORAGE_UPDATE',
              payload: null
            }));
          }
        } catch (e) {
          // Silent catch
        }
      }
      setInterval(checkStorage, 1000);
      checkStorage();
    })();
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'STORAGE_UPDATE' && onStateUpdate) {
        // payload contains { state: { token, userRole, ... } }
        onStateUpdate(message.payload?.state || null);
      }
    } catch (e) {
      // Non-JSON message, ignore
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: targetUrl }}
        style={styles.webview}
        userAgent={customUserAgent}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        injectedJavaScript={injectBridgeJS}
        onMessage={handleMessage}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#eab308" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
