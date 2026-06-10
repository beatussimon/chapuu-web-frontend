import React from 'react';
import { View, Text, StyleSheet, Image, TextInput, Platform } from 'react-native';
import ScalePressable, { ScaleIconButton } from '../ScalePressable';
import { Upload, X, CreditCard, Banknote } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '../../theme';
import { triggerLightHaptic } from '../../hooks/useHaptics';
import { useUser } from '../../context/UserContext';

interface PaymentMethod {
  id: number;
  provider: string;
  account_name: string;
  account_number: string;
  instructions: string;
  image_url: string;
  image: string;
  is_active: boolean;
}

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  paymentMessage: string;
  onPaymentMessageChange: (val: string) => void;
  isInstantPayment: boolean;
  onInstantPaymentChange: (val: boolean) => void;
  userRole: string;
  receiptUri: string | null;
  onReceiptChange: (uri: string | null) => void;
  total: number;
}

export function PaymentMethodSelector({
  paymentMethods,
  paymentMessage,
  onPaymentMessageChange,
  isInstantPayment,
  onInstantPaymentChange,
  userRole,
  receiptUri,
  onReceiptChange,
  total
}: PaymentMethodSelectorProps) {
  const { theme } = useUser();
  const activeColors = {
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? colors.dark[950] : '#000000',
    inputBorder: theme === 'legacy' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.16)',
  };

  const pickImage = async () => {
    triggerLightHaptic();
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      onReceiptChange(result.assets[0].uri);
    }
  };

  const allowedRoles = ['SELLER', 'ADMIN', 'SUPERUSER', 'ACCOUNTANT', 'CHEF'];
  const canDoInstantPayment = allowedRoles.includes(userRole.toUpperCase());

  return (
    <View style={[styles.container, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
      <Text style={styles.sectionTitle}>Payment Details</Text>
      
      {canDoInstantPayment && (
        <ScalePressable 
          style={[styles.instantPaymentCard, isInstantPayment && styles.instantPaymentCardActive]}
          onPress={() => {
            triggerLightHaptic();
            onInstantPaymentChange(!isInstantPayment);
          }}
        >
          <View style={[styles.checkbox, isInstantPayment && styles.checkboxActive]}>
            {isInstantPayment && <View style={styles.checkboxInner} />}
          </View>
          <View style={styles.instantPaymentTextContainer}>
            <Text style={[styles.instantPaymentTitle, isInstantPayment && styles.instantPaymentTitleActive]}>
              Walk-In / Pay on Spot
            </Text>
            <Text style={styles.instantPaymentDesc}>
              Customer is physically present and paying now. Order goes directly to kitchen.
            </Text>
          </View>
        </ScalePressable>
      )}

      {isInstantPayment ? (
        <View style={styles.paidInPersonBox}>
          <View style={styles.paidInPersonIconBox}>
            <CreditCard size={20} color={colors.dark[950]} />
          </View>
          <View>
            <Text style={styles.paidInPersonTitle}>Paid in Person</Text>
            <Text style={styles.paidInPersonDesc}>This order will be marked as PAID immediately.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.offlinePaymentSection}>
          <Text style={styles.offlineTitle}>Proof of Payment (Offline)</Text>
          
          {paymentMethods && paymentMethods.length > 0 ? (
            <View style={styles.dynamicMethodsContainer}>
              <Text style={styles.offlineSubtitle}>Transfer the total to a provider below, then upload proof.</Text>
              
              <View style={styles.methodsGrid}>
                {paymentMethods.filter(pm => pm.is_active).map(pm => (
                  <View key={pm.id} style={styles.dynamicMethodCard}>
                    {(pm.image_url || pm.image) && (
                      <View style={styles.dynamicMethodImageWrapper}>
                        <Image 
                          source={{ uri: pm.image_url || pm.image }} 
                          style={styles.dynamicMethodImage} 
                          resizeMode="contain"
                        />
                      </View>
                    )}
                    
                    <Text style={styles.dynamicMethodProvider}>{pm.provider}</Text>
                    
                    {pm.account_name && (
                      <Text style={styles.dynamicMethodAccountName} numberOfLines={1}>
                        {pm.account_name}
                      </Text>
                    )}
                    
                    {pm.account_number && (
                      <View style={[styles.dynamicMethodAccountNumberBox, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}>
                        <Text style={styles.dynamicMethodAccountNumber}>{pm.account_number}</Text>
                        <Text style={styles.dynamicMethodAccountLabel}>Lipa Number</Text>
                      </View>
                    )}

                    {pm.instructions && (
                      <Text style={styles.dynamicMethodInstructions} numberOfLines={2}>
                        {pm.instructions}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.offlineSubtitle}>
              Please transfer the Total amount to the restaurant natively (M-Pesa, Bank, Cash) and provide proof here to speed up approval.
            </Text>
          )}

          <Text style={styles.inputLabel}>Transaction ID / Message</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}
            value={paymentMessage}
            onChangeText={onPaymentMessageChange}
            placeholder="e.g. Paid via M-Pesa. Ref: ABCD123456"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.inputLabel}>Payment Receipt (Optional Image)</Text>
          <View style={styles.uploadSection}>
            {receiptUri ? (
              <View style={styles.receiptPreview}>
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
                <ScaleIconButton 
                  style={styles.removeReceiptBtn}
                  onPress={() => {
                    triggerLightHaptic();
                    onReceiptChange(null);
                  }}
                >
                  <X size={16} color="#fff" />
                </ScaleIconButton>
              </View>
            ) : (
              <ScalePressable style={styles.uploadBtn} onPress={pickImage}>
                <Upload size={24} color={colors.primary[500]} />
                <Text style={styles.uploadText}>Upload Receipt Image</Text>
              </ScalePressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  
  instantPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  instantPaymentCardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Amber
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    borderRadius: 6,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#f59e0b',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  instantPaymentTextContainer: {
    flex: 1,
  },
  instantPaymentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  instantPaymentTitleActive: {
    color: '#fbbf24',
  },
  instantPaymentDesc: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  
  paidInPersonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  paidInPersonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paidInPersonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  paidInPersonDesc: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  offlinePaymentSection: {
    marginTop: spacing.sm,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  offlineSubtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },

  dynamicMethodsContainer: {
    marginBottom: spacing.xl,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dynamicMethodCard: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  dynamicMethodImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: spacing.sm,
  },
  dynamicMethodImage: {
    width: '100%',
    height: '100%',
  },
  dynamicMethodProvider: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary[400],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dynamicMethodAccountName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  dynamicMethodAccountNumberBox: {
    backgroundColor: colors.dark[950],
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
  },
  dynamicMethodAccountNumber: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#fff',
  },
  dynamicMethodAccountLabel: {
    fontSize: 8,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginTop: 2,
  },
  dynamicMethodInstructions: {
    fontSize: 9,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.dark[950],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  uploadSection: {
    marginTop: spacing.xs,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  uploadText: {
    color: colors.primary[500],
    fontWeight: 'bold',
  },
  receiptPreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 6,
  },
});
