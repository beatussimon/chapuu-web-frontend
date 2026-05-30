import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';
import { MenuItem } from '../../types';
import { 
  Calendar, 
  Grid, 
  Tv, 
  Shield, 
  DollarSign, 
  Navigation,
  ChevronRight
} from 'lucide-react-native';
import ScalePressable from '../../components/ScalePressable';
import { triggerLightHaptic } from '../../hooks/useHaptics';

export default function Tab5Screen() {
  const { userRole, updateUser, token, pendingDeepLinkPath, setPendingDeepLinkPath } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();
  const [currentPath, setCurrentPath] = useState<string>('/reserve');

  useEffect(() => {
    if (pendingDeepLinkPath && pendingDeepLinkPath.startsWith('/reserve')) {
      setCurrentPath(pendingDeepLinkPath);
      setPendingDeepLinkPath(null);
    } else {
      setCurrentPath('/reserve');
    }
  }, [pendingDeepLinkPath, setPendingDeepLinkPath]);

  if (userRole === 'CUSTOMER') {
    return (
      <View style={styles.container}>
        <WebViewTab path={currentPath} onStateUpdate={handleStateUpdate} />
      </View>
    );
  }

  // Generate menu items based on role
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    if (userRole === 'SELLER' || userRole === 'ADMIN' || userRole === 'SUPERUSER') {
      items.push({
        title: 'Host / Reservations',
        description: 'Manage table reservations and seating layouts.',
        path: '/seller/reservations',
        icon: Calendar,
        color: '#4ade80', // green-400
      });
      items.push({
        title: 'Table QR Codes',
        description: 'View and export QR codes for your tables.',
        path: '/seller/qrcodes',
        icon: Grid,
        color: '#818cf8', // indigo-400
      });
      items.push({
        title: 'TV Display Board',
        description: 'Launch order list billboard in TV mode.',
        path: '/tv',
        icon: Tv,
        color: '#2dd4bf', // teal-400
      });

      if (userRole === 'ADMIN' || userRole === 'SUPERUSER') {
        items.push({
          title: 'Platform Admin',
          description: 'Access platform administration configurations.',
          path: '/admin',
          icon: Shield,
          color: '#c084fc', // purple-400
        });
      }
    } else if (userRole === 'CHEF') {
      items.push({
        title: 'TV Queue Display',
        description: 'Launch kitchen queue and orders board.',
        path: '/tv',
        icon: Tv,
        color: '#2dd4bf', // teal-400
      });
    } else if (userRole === 'ACCOUNTANT') {
      items.push({
        title: 'Accounting Center',
        description: 'Manage store invoicing, expenses, and billing.',
        path: '/seller',
        icon: DollarSign,
        color: '#34d399', // emerald-400
      });
    } else if (userRole === 'DELIVERY') {
      items.push({
        title: 'Driver Dispatch',
        description: 'Manage ongoing deliveries and dispatch lists.',
        path: '/delivery',
        icon: Navigation,
        color: '#60a5fa', // blue-400
      });
    }

    return items;
  };

  const handlePress = (item: MenuItem) => {
    triggerLightHaptic();
    // Open the selected screen inside a native modal webview
    router.push({
      pathname: '/more',
      params: { path: item.path, title: item.title }
    });
  };

  const handleLogout = async () => {
    triggerLightHaptic();
    
    // Deregister push notification token
    try {
      const Constants = require('expo-constants').default;
      const Platform = require('react-native').Platform;
      const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
      
      if (Platform.OS === 'android' && isExpoGo) {
        console.log('[Logout] Skipping push token deregistration in Expo Go on Android');
      } else {
        const Notifications = require('expo-notifications');
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (projectId) {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          const pushToken = tokenData.data;
          
          // We use process.env for BASE_URL here
          const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://chapuu.com';
          await fetch(`${BASE_URL}/api/auth/devices/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ push_token: pushToken }),
          });
        }
      }
    } catch (e) {
      console.warn('[Logout] Failed to deregister push token:', e);
    }
    
    updateUser('CUSTOMER', null, null);
    router.replace('/');
  };

  const menuItems = getMenuItems();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Control Directory</Text>
          <Text style={styles.headerSubtitle}>All authorized tools for your account</Text>
        </View>

        <View style={styles.grid}>
          {menuItems.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <ScalePressable 
                key={idx} 
                style={styles.card}
                onPress={() => handlePress(item)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                  <IconComp size={24} color={item.color} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
                <ChevronRight size={18} color="#475569" />
              </ScalePressable>
            );
          })}
        </View>

        <ScalePressable 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>LOG OUT OF SELLER MODE</Text>
        </ScalePressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
