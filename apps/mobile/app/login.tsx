import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Animated
} from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Lock } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import ScalePressable from '../components/ScalePressable';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../hooks/useHaptics';

const DEFAULT_URL = 'https://chapuu.com';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

export default function LoginScreen() {
  const { updateUser } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animated tactile values
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formShake = useRef(new Animated.Value(0)).current;

  // Float upward & fade in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Premium horizontal error shake animation sequence
  const triggerErrorShake = () => {
    triggerErrorHaptic();
    formShake.setValue(0);
    Animated.sequence([
      Animated.timing(formShake, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleBack = () => {
    triggerLightHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding');
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      triggerErrorShake();
      CustomAlert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    triggerLightHaptic();

    try {
      // 1. Get access & refresh tokens (bypassing Axios/interceptors like the web does)
      const tokenResponse = await fetch(`${BASE_URL}/api/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.detail || errorData.error || 'Invalid credentials');
      }

      const { access, refresh } = await tokenResponse.json();

      // 2. Fetch User Profile to get their role
      const profileResponse = await fetch(`${BASE_URL}/api/auth/users/me/`, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      let role = 'CUSTOMER';
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        role = profileData.role || 'CUSTOMER';
      }

      // 3. Register Push Notification Token
      try {
        const Constants = require('expo-constants').default;
        const Platform = require('react-native').Platform;
        const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
        
        if (Platform.OS === 'android' && isExpoGo) {
          console.log('[Login] Skipping push token registration in Expo Go on Android');
        } else {
          const Notifications = require('expo-notifications');
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          if (finalStatus === 'granted') {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            const pushToken = tokenData.data;
            
            await fetch(`${BASE_URL}/api/auth/devices/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`,
              },
              body: JSON.stringify({ push_token: pushToken, platform: Platform.OS }),
            });
            console.log('[Login] Push token registered:', pushToken);
          }
        }
      } catch (e) {
        console.warn('[Login] Failed to register push token:', e);
      }

      // Trigger success haptic before state change unmounts/redirects
      triggerSuccessHaptic();

      // 4. Save tokens and role in global state and secure storage
      await updateUser(role, access, refresh);

      // Routing guard in _layout.tsx will auto-detect token and push to /(tabs)
    } catch (e: unknown) {
      triggerErrorShake();
      setIsLoading(false);
      const errorMessage = e instanceof Error ? e.message : 'Login failed. Please check your network and try again.';
      CustomAlert.alert(
        'Login Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {router.canGoBack() ? (
            <ScalePressable style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color="#ffffff" />
            </ScalePressable>
          ) : (
            <View style={{ height: 44, marginBottom: 40 }} />
          )}

          <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }, { translateX: formShake }], flex: 1 }}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your Chapuu account</Text>
            </View>

            <View style={styles.form}>
              {/* Username Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.iconContainer}>
                  <User size={20} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.iconContainer}>
                  <Lock size={20} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Login Button */}
              <ScalePressable 
                style={[styles.loginButton, isLoading && styles.disabledButton]} 
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <Text style={styles.loginButtonText}>LOG IN</Text>
                )}
              </ScalePressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to Chapuu? </Text>
              <ScalePressable 
                onPress={() => {
                  triggerLightHaptic();
                  router.push('/signup');
                }}
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </ScalePressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // bg-dark-950
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eab308', // Gold
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  signupLink: {
    color: '#eab308',
    fontSize: 14,
    fontWeight: '800',
  },
});
