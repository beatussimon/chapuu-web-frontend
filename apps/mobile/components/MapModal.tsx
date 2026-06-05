import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, Dimensions, Platform } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { X, Navigation, Store, MapPin } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius } from '../theme';
import { triggerLightHaptic } from '../hooks/useHaptics';
import ScalePressable, { ScaleIconButton } from './ScalePressable';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number | null; lng: number | null; name: string | null } | null;
  stores: any[];
  onSelectStore: (store: any) => void;
}

export default function MapModal({ isOpen, onClose, userLocation, stores = [], onSelectStore }: MapModalProps) {
  const webViewRef = useRef<WebView>(null);

  // Generate HTML with Leaflet
  const generateMapHtml = () => {
    const centerLat = userLocation?.lat || -6.78;
    const centerLng = userLocation?.lng || 39.28;
    const zoomLevel = userLocation?.lat ? 14 : 12;

    const markersHtml = stores.map(store => {
      if (!store.latitude || !store.longitude) return '';
      return `
        L.marker([${store.latitude}, ${store.longitude}], { icon: storeIcon })
          .addTo(map)
          .on('click', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_STORE', id: ${store.id} }));
          });
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #020617; }
          #map { height: 100vh; width: 100vw; background: #020617; }
          .leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
          .custom-user-marker {
            background: #3b82f6;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          }
          .custom-store-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: #eab308;
            border: 2px solid #020617;
            border-radius: 50%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], ${zoomLevel});
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            iconSize: [12, 12]
          });

          const storeIcon = L.divIcon({
            html: '<div class="custom-store-marker"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>',
            className: 'store-icon-container',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          if (${!!(userLocation?.lat && userLocation?.lng)}) {
            L.marker([${userLocation?.lat}, ${userLocation?.lng}], { icon: userIcon }).addTo(map);
          }

          ${markersHtml}
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_STORE') {
        const store = stores.find(s => s.id === data.id);
        if (store) {
          onSelectStore(store);
          onClose();
        }
      }
    } catch (e) {}
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
        <Animated.View entering={SlideInDown.duration(250).springify()} style={styles.modalContainer}>
          <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ScaleIconButton onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.text.primary} />
            </ScaleIconButton>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>Map Explorer</Text>
              <Text style={styles.subtitle}>{stores.length} spots near you</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.mapWrapper}>
            <WebView
              ref={webViewRef}
              source={{ html: generateMapHtml() }}
              style={styles.webview}
              onMessage={handleMessage}
              scrollEnabled={false}
            />
          </View>
          </SafeAreaView>
        </Animated.View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
  },
  titleGroup: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  mapWrapper: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  }
});
