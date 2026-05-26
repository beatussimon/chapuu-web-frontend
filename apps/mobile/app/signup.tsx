import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Phone, Lock, ChevronRight, Check } from 'lucide-react-native';
import { useUser } from './_layout';

const DEFAULT_URL = 'https://pasifiq.store';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

export default function SignupScreen() {
  const { updateUser } = useUser();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        Alert.alert('Error', 'Please fill in all fields.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!phone.trim() || !username.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill in all fields.');
        return;
      }
      if (password.length < 4) {
        Alert.alert('Error', 'Password must be at least 4 characters long.');
        return;
      }
      setStep(3);
    }
  };

  const handleSignup = async () => {
    if (!acceptedPolicy) {
      Alert.alert('Agreement Required', 'You must accept the Terms & Mutual Liability Policy.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit Registration POST
      const registerResponse = await fetch(`${BASE_URL}/api/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone_number: phone.trim(),
          password: password,
          accepted_liability_policy: true,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        // Parse and format backend field errors
        let errorMsg = 'Registration failed.';
        if (typeof errorData === 'object') {
          const keys = Object.keys(errorData);
          if (keys.length > 0) {
            errorMsg = `${keys[0].toUpperCase()}: ${errorData[keys[0]]}`;
          }
        }
        throw new Error(errorMsg);
      }

      // 2. Auto-login immediately after registration (matches web behavior)
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
        throw new Error('Account created, but automatic login failed. Please sign in manually.');
      }

      const { access } = await tokenResponse.json();

      // Get user profile to confirm role
      const profileResponse = await fetch(`${BASE_URL}/api/auth/users/me/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
      });

      let role = 'CUSTOMER';
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        role = profileData.role || 'CUSTOMER';
      }

      await updateUser(role, access);
    } catch (e: any) {
      Alert.alert('Signup Failed', e.message || 'Something went wrong.');
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {/* Step Indicators */}
            <View style={styles.stepIndicatorRow}>
              {[1, 2, 3].map((s) => (
                <View 
                  key={s} 
                  style={[
                    styles.stepBadge, 
                    step === s && styles.stepActiveBadge,
                    step > s && styles.stepDoneBadge
                  ]}
                >
                  <Text style={[
                    styles.stepBadgeText,
                    step === s && styles.stepActiveBadgeText,
                    step > s && styles.stepDoneBadgeText
                  ]}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {step === 1 ? 'Profile Information' : step === 2 ? 'Create Account' : 'Terms & Policies'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Enter your basic details' : step === 2 ? 'Set your secure credentials' : 'Agree to complete registration'}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 1 && (
              <>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <User size={20} color="#94a3b8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor="#64748b"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <User size={20} color="#94a3b8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor="#64748b"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <Mail size={20} color="#94a3b8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#64748b"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <Phone size={20} color="#94a3b8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#64748b"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

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
              </>
            )}

            {step === 3 && (
              <View style={styles.policyContainer}>
                <ScrollView style={styles.policyTextScroll}>
                  <Text style={styles.policyHeading}>Terms & Mutual Liability Policy</Text>
                  <Text style={styles.policyBody}>
                    1. Account Security: You are solely responsible for keeping your login credentials confidential.
                    {"\n\n"}
                    2. Dining Reservations: Table reservations must be cancelled at least 2 hours before the scheduled time to avoid vendor fees.
                    {"\n\n"}
                    3. Delivery Liability: Chapuu operates as a multi-vendor platform. Vendors are liable for food quality, while delivery agents are responsible for direct transit handoff validation via verification codes.
                    {"\n\n"}
                    4. Acceptable Conduct: Users must interact respectfully with vendors and riders. Violation of terms may result in account termination.
                  </Text>
                </ScrollView>

                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => setAcceptedPolicy(!acceptedPolicy)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}>
                    {acceptedPolicy && <Check size={14} color="#020617" />}
                  </View>
                  <Text style={styles.checkboxLabel}>I read and accept the Liability Policy</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            {step < 3 ? (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleNextStep}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>CONTINUE</Text>
                <ChevronRight size={18} color="#020617" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.actionButton, isLoading && styles.disabledButton]} 
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>AGREE & SIGN UP</Text>
                    <Check size={18} color="#020617" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
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
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
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
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActiveBadge: {
    backgroundColor: '#eab308',
    borderColor: '#eab308',
  },
  stepDoneBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  stepActiveBadgeText: {
    color: '#020617',
  },
  stepDoneBadgeText: {
    color: '#eab308',
  },
  titleContainer: {
    marginBottom: 36,
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
  policyContainer: {
    gap: 20,
  },
  policyTextScroll: {
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  policyHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  policyBody: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#eab308',
    borderColor: '#eab308',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  actionButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eab308', // Gold
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
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
  loginLink: {
    color: '#eab308',
    fontSize: 14,
    fontWeight: '800',
  },
});
