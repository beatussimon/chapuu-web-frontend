import React, { useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_URL = 'https://pasifiq.store';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

interface WebViewTabProps {
  path: string;
  onStateUpdate?: (state: any) => void;
}

export default function WebViewTab({ path, onStateUpdate }: WebViewTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // Normalize path
  const targetPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${BASE_URL}${targetPath}`;

  // JavaScript injected to bridge Zustand store updates from localStorage to native
  const injectBridgeJS = `
    (function() {
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
      // Poll storage every second to catch any state mutation
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
