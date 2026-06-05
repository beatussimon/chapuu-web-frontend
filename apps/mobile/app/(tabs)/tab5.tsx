import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Vibration } from 'react-native';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';
import { MenuItem } from '../../types';
import apiClient from '../../services/api';
import { hasPermission } from '../../config/permissions';
import { colors, spacing, borderRadius } from '../../theme';
import { 
  Calendar, 
  Grid, 
  Tv, 
  Shield, 
  DollarSign, 
  Navigation,
  ChevronRight,
  User,
  ShoppingBag,
  LogOut,
  Award,
  Phone,
  Mail,
  Heart,
  Settings
} from 'lucide-react-native';
import ScalePressable from '../../components/ScalePressable';
import OptimizedImage from '../../components/OptimizedImage';
import { triggerLightHaptic, triggerSelectionHaptic } from '../../hooks/useHaptics';
import { CustomAlert } from '../../components/CustomAlert';

export default function Tab5Screen() {
  const { userRole, updateUser, token, pendingDeepLinkPath, setPendingDeepLinkPath, profileData, fetchUserProfile } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();
  const [currentPath, setCurrentPath] = useState<string>('/reserve');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Deep linking for reservations
  useEffect(() => {
    if (pendingDeepLinkPath && pendingDeepLinkPath.startsWith('/reserve')) {
      setCurrentPath(pendingDeepLinkPath);
      setPendingDeepLinkPath(null);
    }
  }, [pendingDeepLinkPath, setPendingDeepLinkPath]);

  // Sync profile data from context
  useEffect(() => {
    if (token && !profileData) {
      fetchUserProfile();
    }
  }, [token, profileData]);

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
          
          const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://chapuu.com';
          await fetch(`${BASE_URL}/api/auth/devices/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ registration_id: pushToken })
          });
        }
      }
    } catch (e) {
      console.warn('[Logout] Failed to deregister token:', e);
    }

    updateUser('CUSTOMER', null, null);
    router.replace('/');
  };

  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    if (hasPermission(userRole, 'MANAGE_RESERVATIONS')) {
      items.push({
        title: 'Host / Reservations',
        description: 'Manage table reservations and seating layouts.',
        path: '/seller/reservations',
        icon: Calendar,
        color: '#4ade80', // green-400
      });
    }

    if (hasPermission(userRole, 'MANAGE_QR')) {
      items.push({
        title: 'Table QR Codes',
        description: 'View and export QR codes for your tables.',
        path: '/seller/qrcodes',
        icon: Grid,
        color: '#818cf8', // indigo-400
      });
    }

    if (hasPermission(userRole, 'TV_DASHBOARD')) {
      items.push({
        title: userRole === 'CHEF' ? 'TV Queue Display' : 'TV Display Board',
        description: userRole === 'CHEF' ? 'Launch kitchen queue and orders board.' : 'Launch order list billboard in TV mode.',
        path: '/tv',
        icon: Tv,
        color: '#2dd4bf', // teal-400
      });
    }

    if (hasPermission(userRole, 'PLATFORM_ADMIN')) {
      items.push({
        title: 'Platform Admin',
        description: 'Access platform administration configurations.',
        path: '/admin',
        icon: Shield,
        color: '#c084fc', // purple-400
      });
    }

    if (hasPermission(userRole, 'ACCOUNTING')) {
      items.push({
        title: 'Accounting Center',
        description: 'Manage store invoicing, expenses, and billing.',
        path: '/seller',
        icon: DollarSign,
        color: '#34d399', // emerald-400
      });
    }

    if (hasPermission(userRole, 'DELIVERY_DISPATCH')) {
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

  const handleWebViewPress = (path: string, title: string) => {
    triggerLightHaptic();
    router.push({
      pathname: '/more',
      params: { path, title }
    });
  };

  // ────────── RENDER LOGGED OUT STATE ──────────
  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.loggedOutContent}>
          <View style={styles.welcomeCard}>
            <View style={styles.avatarPlaceholderLarge}>
              <User size={48} color={colors.primary[500]} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Chapuu</Text>
            <Text style={styles.welcomeDesc}>
              Sign in to easily place orders, reserve VIP tables, track real-time deliveries, and earn loyalty points at your favorite spots!
            </Text>

            <View style={styles.authButtonsContainer}>
              <ScalePressable 
                style={styles.primaryLoginBtn} 
                onPress={() => { triggerSelectionHaptic(); router.push('/login'); }}
              >
                <Text style={styles.primaryLoginBtnText}>LOG IN</Text>
              </ScalePressable>

              <ScalePressable 
                style={styles.outlineSignupBtn} 
                onPress={() => { triggerSelectionHaptic(); router.push('/signup'); }}
              >
                <Text style={styles.outlineSignupBtnText}>CREATE AN ACCOUNT</Text>
              </ScalePressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ────────── RENDER LOGGED IN STATE ──────────
  const menuItems = getMenuItems();
  const avatarLetter = profileData?.first_name ? profileData.first_name[0].toUpperCase() : (profileData?.username ? profileData.username[0].toUpperCase() : '?');
  const fullName = profileData?.first_name ? `${profileData.first_name} ${profileData.last_name || ''}`.trim() : (profileData?.username || 'Valued Customer');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isLoading ? (
        <View style={styles.contentContainer}>
          <View style={styles.profileCard}>
            <View style={styles.profileMainRow}>
              <LoadingSkeleton style={{ width: 64, height: 64, borderRadius: 32 }} />
              <View style={[styles.profileMainInfo, { justifyContent: 'center' }]}>
                <LoadingSkeleton style={{ width: 140, height: 24, marginBottom: 8 }} />
                <LoadingSkeleton style={{ width: 80, height: 20, borderRadius: 10 }} />
              </View>
            </View>
            <View style={styles.divider} />
            <LoadingSkeleton style={{ width: '100%', height: 16, marginBottom: 16 }} />
            <LoadingSkeleton style={{ width: '100%', height: 16, marginBottom: 16 }} />
            <LoadingSkeleton style={{ width: '60%', height: 16 }} />
          </View>
          <View style={[styles.profileCard, { marginTop: 16 }]}>
            <LoadingSkeleton style={{ width: '100%', height: 48, marginBottom: 8 }} />
            <LoadingSkeleton style={{ width: '100%', height: 48, marginBottom: 8 }} />
            <LoadingSkeleton style={{ width: '100%', height: 48 }} />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Premium Profile Details Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileMainRow}>
              <View style={styles.avatarLarge}>
                {profileData?.profile_picture ? (
                  <OptimizedImage src={profileData.profile_picture} wrapperStyle={styles.avatarImage} style={styles.avatarImage} placeholderType="profile" />
                ) : (
                  <Text style={styles.avatarText}>{avatarLetter}</Text>
                )}
              </View>
              <View style={styles.profileMainInfo}>
                <Text style={styles.profileName}>{fullName}</Text>
                <View style={styles.roleBadgeContainer}>
                  <Text style={styles.roleBadgeText}>{userRole}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.profileDetailRows}>
              <View style={styles.detailRow}>
                <User size={16} color="#64748b" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Username</Text>
                <Text style={styles.detailValue}>{profileData?.username || '—'}</Text>
              </View>

              {profileData?.email ? (
                <View style={styles.detailRow}>
                  <Mail size={16} color="#64748b" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{profileData.email}</Text>
                </View>
              ) : null}

              {profileData?.phone_number ? (
                <View style={styles.detailRow}>
                  <Phone size={16} color="#64748b" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{profileData.phone_number}</Text>
                </View>
              ) : null}

              {profileData?.loyalty_points !== undefined && (
                <View style={styles.detailRow}>
                  <Award size={16} color={colors.primary[400]} style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Loyalty Points</Text>
                  <Text style={[styles.detailValue, { color: colors.primary[400], fontWeight: 'bold' }]}>{profileData.loyalty_points} Points</Text>
                </View>
              )}
            </View>
          </View>

          {/* Main Account Shortcuts */}
          <View style={styles.sectionHeaderSpacing}>
            <Text style={styles.sectionHeaderTitle}>Account Controls</Text>
          </View>

          <View style={styles.shortcutsList}>
            {/* Quick Favorites shortcut */}
            <ScalePressable 
              style={styles.shortcutCard}
              onPress={() => { triggerSelectionHaptic(); router.push('/favorites'); }}
            >
              <View style={[styles.shortcutIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Heart size={22} color={colors.error} fill={colors.error} />
              </View>
              <View style={styles.shortcutCardText}>
                <Text style={styles.shortcutCardTitle}>My Favorites</Text>
                <Text style={styles.shortcutCardDesc}>View your saved restaurants and shops</Text>
              </View>
              <ChevronRight size={18} color="#475569" />
            </ScalePressable>

            {/* Quick Orders shortcut */}
            <ScalePressable 
              style={styles.shortcutCard}
              onPress={() => { triggerSelectionHaptic(); router.replace('/(tabs)/tab4'); }}
            >
              <View style={[styles.shortcutIconWrapper, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                <ShoppingBag size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.shortcutCardText}>
                <Text style={styles.shortcutCardTitle}>My Orders</Text>
                <Text style={styles.shortcutCardDesc}>Track active orders and view history</Text>
              </View>
              <ChevronRight size={18} color="#475569" />
            </ScalePressable>

            {/* Quick Profile Edit shortcut */}
            <ScalePressable 
              style={styles.shortcutCard}
              onPress={() => { triggerSelectionHaptic(); router.push('/profile'); }}
            >
              <View style={[styles.shortcutIconWrapper, { backgroundColor: 'rgba(96, 165, 250, 0.1)' }]}>
                <User size={22} color="#60a5fa" />
              </View>
              <View style={styles.shortcutCardText}>
                <Text style={styles.shortcutCardTitle}>Update Profile</Text>
                <Text style={styles.shortcutCardDesc}>Change email, phone, and name details</Text>
              </View>
              <ChevronRight size={18} color="#475569" />
            </ScalePressable>

            {/* Quick Settings shortcut */}
            <ScalePressable 
              style={styles.shortcutCard}
              onPress={() => { triggerSelectionHaptic(); router.push('/settings'); }}
            >
              <View style={[styles.shortcutIconWrapper, { backgroundColor: 'rgba(148, 163, 184, 0.1)' }]}>
                <Settings size={22} color="#94a3b8" />
              </View>
              <View style={styles.shortcutCardText}>
                <Text style={styles.shortcutCardTitle}>Settings</Text>
                <Text style={styles.shortcutCardDesc}>Notifications, appearance, and privacy</Text>
              </View>
              <ChevronRight size={18} color="#475569" />
            </ScalePressable>
          </View>

          {/* Seller / Staff Portal Directories */}
          {menuItems.length > 0 && (
            <>
              <View style={styles.sectionHeaderSpacing}>
                <Text style={styles.sectionHeaderTitle}>Management Portals</Text>
              </View>
              <View style={styles.shortcutsList}>
                {menuItems.map((item, idx) => (
                  <ScalePressable 
                    key={idx}
                    style={styles.shortcutCard}
                    onPress={() => handleWebViewPress(item.path, item.title)}
                  >
                    <View style={[styles.shortcutIconWrapper, { backgroundColor: `${item.color}15` }]}>
                      <item.icon size={22} color={item.color} />
                    </View>
                    <View style={styles.shortcutCardText}>
                      <Text style={styles.shortcutCardTitle}>{item.title}</Text>
                      <Text style={styles.shortcutCardDesc}>{item.description}</Text>
                    </View>
                    <ChevronRight size={18} color="#475569" />
                  </ScalePressable>
                ))}
              </View>
            </>
          )}

          <ScalePressable 
            style={styles.logoutBtn}
            onPress={() => {
              CustomAlert.alert(
                "Confirm Logout",
                "Are you sure you want to log out of Chapuu?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Logout", style: "destructive", onPress: handleLogout }
                ]
              );
            }}
          >
            <LogOut size={18} color="#f87171" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>LOG OUT</Text>
          </ScalePressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#020617',
  },
  profileMainInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleBadgeContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#eab308',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
  profileDetailRows: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  sectionHeaderSpacing: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: 4,
  },
  shortcutsList: {
    gap: 12,
    marginBottom: 16,
  },
  shortcutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortcutIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shortcutCardText: {
    flex: 1,
    paddingRight: 8,
  },
  shortcutCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  shortcutCardDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 14,
  },
  logoutBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  loggedOutContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  welcomeCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarPlaceholderLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  authButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryLoginBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  primaryLoginBtnText: {
    color: colors.dark[950],
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  outlineSignupBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  outlineSignupBtnText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
