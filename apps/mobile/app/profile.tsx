import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Phone, CheckCircle2, Camera, PenTool, FileText, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import OptimizedImage from '../components/OptimizedImage';
import { useRouter } from 'expo-router';

import apiClient from '../services/api';
import { useUser } from '../context/UserContext';
import { colors, spacing, borderRadius } from '../theme';
import ScalePressable from '../components/ScalePressable';
import { triggerLightHaptic, triggerNotificationHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { CustomAlert } from '../components/CustomAlert';

const signatureHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: #ffffff;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: crosshair;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      window.addEventListener('resize', resize);
      resize();

      let drawing = false;

      function getTouchPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      }

      function startDrawing(e) {
        drawing = true;
        const pos = getTouchPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DRAWING_START' }));
      }

      function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getTouchPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      function stopDrawing() {
        if (drawing) {
          drawing = false;
          ctx.closePath();
          const dataUrl = canvas.toDataURL('image/png');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DRAWING_END', data: dataUrl }));
        }
      }

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);

      canvas.addEventListener('touchstart', startDrawing);
      canvas.addEventListener('touchmove', draw);
      canvas.addEventListener('touchend', stopDrawing);
      canvas.addEventListener('touchcancel', stopDrawing);

      window.addEventListener('message', function(e) {
        if (e.data === 'clear') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLEARED' }));
        }
      });
    </script>
  </body>
  </html>
`;

export default function EditProfileScreen() {
  const router = useRouter();
  const { profileData, fetchUserProfile, theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? colors.dark[900] : '#000000',
    inputBorder: theme === 'legacy' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.16)',
    modalOverlay: theme === 'legacy' ? 'rgba(2, 6, 23, 0.95)' : 'rgba(0, 0, 0, 0.95)',
    modalHeaderBg: theme === 'legacy' ? 'rgba(2, 6, 23, 0.5)' : '#121212',
    modalFooterBg: theme === 'legacy' ? 'rgba(2, 6, 23, 0.5)' : '#121212',
  };
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Application & Signature States
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeApp, setActiveApp] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);

  const fetchApplications = async () => {
    try {
      const res = await apiClient.get('/seller-applications/');
      const appsData = res.data?.results || res.data;
      setMyApplications(Array.isArray(appsData) ? appsData : []);
    } catch (err) {
      console.warn("[Profile] Failed to load applications", err);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (profileData) {
      // Strip +255 or 255 prefix for Tanzanian local 9-digit standard on edit screen
      const rawPhone = profileData.phone_number || '';
      const parsedLocal = rawPhone.replace(/\D/g, '');
      const localPhone = parsedLocal.length >= 9 ? parsedLocal.slice(-9) : parsedLocal;

      setFormData({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone_number: localPhone,
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

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      CustomAlert.alert("Error", "First name and Last name are required.");
      return;
    }

    if (formData.phone_number.length !== 9) {
      CustomAlert.alert("Invalid Phone Number", "Phone number must be exactly 9 digits.");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+255${formData.phone_number}`;
      const data = new FormData();
      data.append('first_name', formData.first_name.trim());
      data.append('last_name', formData.last_name.trim());
      data.append('phone_number', fullPhone);

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

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'DRAWING_END') {
        setSignatureData(msg.data);
      } else if (msg.type === 'CLEARED') {
        setSignatureData(null);
      }
    } catch (err) {}
  };

  const clearSignature = () => {
    triggerLightHaptic();
    webViewRef.current?.postMessage('clear');
    setSignatureData(null);
  };

  const submitSignature = async () => {
    if (!signatureData) {
      triggerSelectionHaptic();
      CustomAlert.alert("Signature Required", "Please provide a signature before submitting.");
      return;
    }

    setIsSigning(true);
    try {
      await apiClient.post(`/seller-applications/${activeApp.id}/sign/`, {
        digital_signature: signatureData
      });
      triggerNotificationHaptic('success');
      CustomAlert.alert("Success", "Contract signed successfully!");
      setShowSignatureModal(false);
      setSignatureData(null);
      fetchApplications(); // Refresh list
    } catch (err) {
      CustomAlert.alert("Signing Failed", "Could not submit signature.");
    } finally {
      setIsSigning(false);
    }
  };

  const activeApplication = Array.isArray(myApplications) ? myApplications.find(app => ['AWAITING_SIGNATURE', 'PENDING_REVIEW', 'UNDER_REVIEW'].includes(app.status)) : null;
  const isAwaitingSignature = activeApplication?.status === 'AWAITING_SIGNATURE';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
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
          {/* Applications Status Banner */}
          {activeApplication && (
            <View style={[
              styles.appBanner,
              isAwaitingSignature ? styles.appBannerSignature : styles.appBannerReview
            ]}>
              <View style={styles.appBannerHeader}>
                <View style={[
                  styles.appBannerIconWrapper,
                  isAwaitingSignature ? styles.appBannerIconSignature : styles.appBannerIconReview
                ]}>
                  {isAwaitingSignature ? (
                    <PenTool size={20} color="#eab308" />
                  ) : (
                    <FileText size={20} color="#60a5fa" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appBannerTitle}>
                    {isAwaitingSignature ? 'Action Required: Sign Contract' : 'Application Under Review'}
                  </Text>
                  <Text style={styles.appBannerDesc}>
                    {isAwaitingSignature 
                      ? `Your application for ${activeApplication.store_name} is ready. Please sign the agreement to proceed.`
                      : `Your application for ${activeApplication.store_name} is currently being reviewed.`
                    }
                  </Text>
                </View>
              </View>
              {isAwaitingSignature && (
                <ScalePressable
                  style={styles.signBtn}
                  onPress={() => {
                    setActiveApp(activeApplication);
                    setShowSignatureModal(true);
                  }}
                >
                  <Text style={styles.signBtnText}>Review & Sign Agreement</Text>
                </ScalePressable>
              )}
            </View>
          )}
          
          <ScalePressable style={styles.avatarSection} onPress={pickImage}>
            <View style={styles.avatarCircle}>
              {profileImage ? (
                <OptimizedImage src={profileImage} wrapperStyle={styles.avatarImage as any} style={styles.avatarImage as any} />
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

          <View style={[styles.formSection, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}>
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
              <View style={[styles.inputWrapper, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}>
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
              <View style={[styles.inputWrapper, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}>
                <Phone size={18} color={colors.text.tertiary} style={styles.inputIcon} />
                <Text style={{ color: colors.text.primary, fontWeight: 'bold', marginRight: spacing.xs, fontSize: 14 }}>+255</Text>
                <TextInput
                  style={[styles.input, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', letterSpacing: 1 }]}
                  placeholder="712345678"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={formData.phone_number}
                  maxLength={9}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone_number: text.replace(/\D/g, '') }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address (Read Only)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme === 'legacy' ? 'rgba(255,255,255,0.02)' : '#0a0a0a', borderColor: activeColors.inputBorder }]}>
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

        <View style={[styles.footer, { borderTopColor: activeColors.border }]}>
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

      {/* Interactive Seller Agreement Signing Modal */}
      {showSignatureModal && activeApp && (
        <Modal visible={showSignatureModal} transparent animationType="slide" onRequestClose={() => setShowSignatureModal(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: activeColors.modalOverlay }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={[styles.modalContent, { backgroundColor: activeColors.bg, borderColor: activeColors.border }]}>
                
                {/* Modal Header */}
                <View style={[styles.modalHeader, { backgroundColor: activeColors.modalHeaderBg, borderBottomColor: activeColors.border }]}>
                  <Text style={styles.modalHeaderTitle}>Seller Agreement</Text>
                  <ScalePressable style={styles.closeBtn} onPress={() => setShowSignatureModal(false)}>
                    <X size={20} color={colors.text.primary} />
                  </ScalePressable>
                </View>

                {/* Contract Body */}
                <ScrollView style={styles.contractBody} contentContainerStyle={{ padding: spacing.lg }}>
                  <View style={styles.contractAlert}>
                    <Text style={styles.contractAlertText}>
                      This agreement is entered into between <Text style={{ fontWeight: 'bold', color: colors.primary[400] }}>Chapuu</Text> and <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{activeApp.applicant_name}</Text>, trading as <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{activeApp.store_name}</Text>.
                    </Text>
                  </View>

                  <View style={styles.contractSection}>
                    <Text style={styles.contractSectionTitle}>1. Liability and Compliance</Text>
                    <Text style={styles.contractSectionText}>
                      The Seller acknowledges and agrees that all liability for the quality, safety, and legality of the products sold through the Platform rests entirely with the Seller. The Platform acts solely as an intermediary matching service and assumes no liability for food poisoning, injury, or damages arising from the Seller's products.
                    </Text>
                  </View>

                  {activeApp.trial_period_days > 0 && (
                    <View style={[styles.contractSection, styles.contractSectionPromo]}>
                      <Text style={[styles.contractSectionTitle, { color: colors.primary[400] }]}>2. Free Trial Period</Text>
                      <Text style={[styles.contractSectionText, { color: colors.text.primary }]}>
                        The Seller is granted a {activeApp.trial_period_days}-day free trial period starting from the date of account activation. During this period, the Platform will charge 0% commission on orders. Upon expiration of the trial, standard commission rates ({activeApp.store_type === 'SHOP' ? '2%' : '7%'}) will automatically apply.
                      </Text>
                    </View>
                  )}

                  <View style={styles.contractSection}>
                    <Text style={styles.contractSectionTitle}>{activeApp.trial_period_days > 0 ? '3. Customer Standards' : '2. Customer Standards'}</Text>
                    <Text style={styles.contractSectionText}>
                      The Seller commits to upholding the highest standards of customer service, ensuring timely preparation, accurate fulfillment, and professional handling of customer inquiries and complaints.
                    </Text>
                  </View>

                  <View style={styles.contractSection}>
                    <Text style={styles.contractSectionTitle}>{activeApp.trial_period_days > 0 ? '4. Payment and Penalties' : '3. Payment and Penalties'}</Text>
                    <Text style={styles.contractSectionText}>
                      The Seller agrees to pay all applicable platform fees and standard commissions ({activeApp.store_type === 'SHOP' ? '2%' : '7%'}) on time. Late payments may result in account suspension and a penalty fee of up to 15% on the outstanding balance as per Tanzanian regulatory guidelines.
                    </Text>
                  </View>

                  <View style={styles.contractSection}>
                    <Text style={styles.contractSectionTitle}>{activeApp.trial_period_days > 0 ? '5. Legally Binding' : '4. Legally Binding'}</Text>
                    <Text style={styles.contractSectionText}>
                      By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement. This digital signature is legally binding under the Electronic Transactions Act of Tanzania.
                    </Text>
                  </View>
                </ScrollView>

                {/* Drawing Signature Canvas */}
                <View style={[styles.signatureBox, { backgroundColor: activeColors.inputBg, borderTopColor: activeColors.border }]}>
                  <View style={styles.signatureBoxHeader}>
                    <Text style={styles.signatureLabel}>Please Sign Inside the Box:</Text>
                    <ScalePressable onPress={clearSignature}>
                      <Text style={styles.clearLink}>Clear Signature</Text>
                    </ScalePressable>
                  </View>
                  <View style={styles.canvasContainer}>
                    <WebView
                      ref={webViewRef}
                      originWhitelist={['*']}
                      source={{ html: signatureHtml }}
                      onMessage={handleWebViewMessage}
                      style={{ flex: 1 }}
                      scrollEnabled={false}
                    />
                  </View>
                </View>

                {/* Modal Footer Actions */}
                <View style={[styles.modalFooter, { backgroundColor: activeColors.modalFooterBg, borderTopColor: activeColors.border }]}>
                  <ScalePressable style={styles.cancelModalBtn} onPress={() => setShowSignatureModal(false)}>
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </ScalePressable>
                  <ScalePressable 
                    style={[styles.agreeBtn, isSigning && { opacity: 0.5 }]} 
                    onPress={submitSignature}
                    disabled={isSigning}
                  >
                    {isSigning ? (
                      <ActivityIndicator color={colors.dark[950]} />
                    ) : (
                      <>
                        <PenTool size={16} color={colors.dark[950]} />
                        <Text style={styles.agreeBtnText}>Sign & Agree</Text>
                      </>
                    )}
                  </ScalePressable>
                </View>

              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerIconBtn: { padding: spacing.sm, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.xl },
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
  saveBtnText: { color: colors.dark[950], fontSize: 16, fontWeight: 'bold' },

  // Application Status Banner
  appBanner: {
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  appBannerSignature: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  appBannerReview: {
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    borderColor: 'rgba(96, 165, 250, 0.25)',
  },
  appBannerHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  appBannerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBannerIconSignature: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  appBannerIconReview: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  appBannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: 4,
  },
  appBannerDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  signBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signBtnText: {
    color: colors.dark[950],
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.dark[900],
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  contractBody: {
    flex: 1,
  },
  contractAlert: {
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.15)',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  contractAlertText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  contractSection: {
    marginBottom: spacing.xl,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    paddingLeft: spacing.md,
  },
  contractSectionPromo: {
    borderLeftColor: colors.primary[500],
    backgroundColor: 'rgba(234, 179, 8, 0.02)',
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contractSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  contractSectionText: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  signatureBox: {
    padding: spacing.lg,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  signatureBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  signatureLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text.primary,
  },
  clearLink: {
    fontSize: 12,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
  canvasContainer: {
    height: 150,
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cancelModalBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  cancelModalBtnText: {
    color: colors.text.secondary,
    fontWeight: '800',
    fontSize: 14,
  },
  agreeBtn: {
    backgroundColor: colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  agreeBtnText: {
    color: colors.dark[950],
    fontSize: 14,
    fontWeight: '900',
  },
});
