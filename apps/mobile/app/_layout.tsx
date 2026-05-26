import React, { createContext, useContext, useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StatusBar } from 'react-native';

interface UserContextType {
  userRole: string | null;
  token: string | null;
  updateUser: (role: string | null, token: string | null) => void;
}

const UserContext = createContext<UserContextType>({
  userRole: 'CUSTOMER',
  token: null,
  updateUser: () => {},
});

export const useUser = () => useContext(UserContext);

export default function RootLayout() {
  const [userRole, setUserRole] = useState<string | null>('CUSTOMER');
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // Load cached role/token on mount
  useEffect(() => {
    async function loadCachedUser() {
      try {
        const cachedRole = await AsyncStorage.getItem('chapuu_user_role');
        const cachedToken = await AsyncStorage.getItem('chapuu_access_token');
        if (cachedRole) {
          setUserRole(cachedRole);
        }
        if (cachedToken) {
          setToken(cachedToken);
        }
      } catch (e) {
        // Silent error
      } finally {
        setIsReady(true);
      }
    }
    loadCachedUser();
  }, []);

  // Auth routing guard redirect
  useEffect(() => {
    if (!isReady) return;

    // Check if user is in onboarding or auth screens
    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'onboarding' || currentSegment === 'login' || currentSegment === 'signup';

    if (!token) {
      // Force onboarding/login if not logged in
      if (!inAuthGroup) {
        router.replace('/onboarding');
      }
    } else {
      // Force tab shell if already logged in
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [token, segments, isReady]);

  const updateUser = async (role: string | null, tokenVal: string | null) => {
    setUserRole(role);
    setToken(tokenVal);
    try {
      if (role) {
        await AsyncStorage.setItem('chapuu_user_role', role);
      } else {
        await AsyncStorage.removeItem('chapuu_user_role');
      }
      if (tokenVal) {
        await AsyncStorage.setItem('chapuu_access_token', tokenVal);
      } else {
        await AsyncStorage.removeItem('chapuu_access_token');
      }
    } catch (e) {
      // Silent error
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#eab308" />
      </View>
    );
  }

  return (
    <UserContext.Provider value={{ userRole, token, updateUser }}>
      {/* Translucent status bar matches the app theme background (#020617) perfectly */}
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="more" options={{ presentation: 'modal' }} />
      </Stack>
    </UserContext.Provider>
  );
}
