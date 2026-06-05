import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Phone, CheckCircle2, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import OptimizedImage from '../components/OptimizedImage';
import { useRouter } from 'expo-router';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, borderRadius } from '../theme';
import ScalePressable from '../components/ScalePressable';
import { triggerLightHaptic, triggerNotificationHaptic } from '../hooks/useHaptics';
import { CustomAlert } from '../components/CustomAlert';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profileData, fetchUserProfile } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (profileData) {
      setFormData({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone_number: profileData.phone_number || '',
      });
      if (profileData.profile_picture) {
        setProfileImage(profileData.profile_picture);
      }
    }
  }, [profileData]);

  const pickImage = async () => {
    triggerLightHaptic();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    triggerLightHaptic();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('phone_number', formData.phone_number);

      if (profileImage && !profileImage.startsWith('http')) {
        const filename = profileImage.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        data.append('profile_picture', {
          uri: Platform.OS === 'ios' ? profileImage.replace('file://', '') : profileImage,
          name: filename,
          type,
        } as any);
      }

      await apiClient.patch('/auth/users/me/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchUserProfile(); // refresh global context
      triggerNotificationHaptic('success');
      CustomAlert.alert("Success", "Profile updated successfully!");
      router.back();
    } catch (err: any) {
      CustomAlert.alert("Update Failed", err?.response?.data?.detail || "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ScalePressable style={styles.headerIconBtn} onPress={() => { triggerLightHaptic(); router.back(); }}>
          <ArrowLeft size={20} color={colors.text.secondary} />
        </ScalePressable>
        <Text style={styles.headerTitle}>Update Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <KeyboardAwareScrollView 
          bottomOffset={20}
          style={styles.scrollArea} 
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          
          <ScalePressable style={styles.avatarSection} onPress={pickImage}>
            <View style={styles.avatarCircle}>
              {profileImage ? (
                <OptimizedImage src={profileImage} wrapperStyle={styles.avatarImage} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {formData.first_name ? formData.first_name[0].toUpperCase() : (profileData?.username ? profileData.username[0].toUpperCase() : '?')}
                </Text>
              )}
              <View style={styles.cameraBadge}>
                <Camera size={14} color={colors.dark[950]} />
              </View>
            </View>
            <Text style={styles.usernameText}>@{profileData?.username}</Text>
          </ScalePressable>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.first_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.last_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, last_name: text }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={formData.phone_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone_number: text }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address (Read Only)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                <Mail size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.tertiary }]}
                  value={profileData?.email || ''}
                  editable={false}
                />
              </View>
            </View>

          </View>
        </KeyboardAwareScrollView>

        <View style={styles.footer}>
          <ScalePressable style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.dark[950]} /> : (
              <>
                <CheckCircle2 size={18} color={colors.dark[950]} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </ScalePressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark[950] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerIconBtn: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.text.primary },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  
  avatarSection: { alignItems: 'center', marginBottom: spacing['2xl'] },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarLetter: { fontSize: 32, fontWeight: '900', color: colors.dark[950] },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.dark[950] },
  usernameText: { fontSize: 16, fontWeight: 'bold', color: colors.text.secondary },
  
  formSection: { backgroundColor: colors.surfaceHighlight, padding: spacing.lg, borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.lg },
  
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: 'bold', color: colors.text.secondary, textTransform: 'uppercase', marginBottom: spacing.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dark[900], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl, paddingHorizontal: spacing.md },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, height: 48, color: colors.text.primary, fontSize: 14 },
  
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { backgroundColor: colors.primary[500], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl },
  saveBtnText: { color: colors.dark[950], fontSize: 16, fontWeight: 'bold' }
});
