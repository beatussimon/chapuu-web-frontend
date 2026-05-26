import React, { createContext, useContext, useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      }
    }
    loadCachedUser();
  }, []);

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

  return (
    <UserContext.Provider value={{ userRole, token, updateUser }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="more" options={{ presentation: 'modal' }} />
      </Stack>
    </UserContext.Provider>
  );
}
