import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, TextInput, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { X, Star } from 'lucide-react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import apiClient from '../../services/api';
import { CustomAlert } from '../CustomAlert';
import { colors, spacing, borderRadius } from '../../theme';
import { useUser } from '../../context/UserContext';
import { triggerSelectionHaptic, triggerNotificationHaptic } from '../../hooks/useHaptics';
import ScalePressable, { ScaleIconButton } from '../../components/ScalePressable';

interface ReviewModalProps {
  visible: boolean;
  orderId: string | number;
  storeId: string | number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ visible, orderId, storeId, onClose, onSuccess }: ReviewModalProps) {
  const { theme } = useUser();
  const activeColors = {
    overlayBg: theme === 'legacy' ? 'rgba(2, 6, 23, 0.85)' : 'rgba(0, 0, 0, 0.9)',
    card: theme === 'legacy' ? colors.dark[900] : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : '#000000',
  };

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      CustomAlert.alert("Required", "Please select a star rating.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/reviews/', {
        store: storeId,
        order: orderId,
        rating,
        comment,
      });
      triggerNotificationHaptic('success');
      CustomAlert.alert("Review Submitted", "Thank you for your feedback!");
      onSuccess();
    } catch (err: any) {
      CustomAlert.alert("Failed", err?.response?.data?.error || "Could not submit review.");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <ScalePressable
            key={star}
            onPress={() => {
              triggerSelectionHaptic();
              setRating(star);
            }}
            style={styles.starBtn}
          >
            <Star 
              size={36} 
              color={rating >= star ? '#eab308' : colors.text.tertiary} 
              fill={rating >= star ? '#eab308' : 'transparent'} 
            />
          </ScalePressable>
        ))}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView 
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          style={[styles.overlay, { backgroundColor: activeColors.overlayBg }]}
        >
          <Animated.View entering={SlideInDown.duration(250).springify()} style={[styles.container, { backgroundColor: activeColors.card, borderColor: activeColors.border, borderTopColor: activeColors.border }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Rate Your Experience</Text>
              <ScaleIconButton onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.text.secondary} />
              </ScaleIconButton>
            </View>

            <Text style={styles.desc}>How was your meal? Your feedback helps the restaurant improve.</Text>

            {renderStars()}

            <TextInput
              style={[styles.input, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
              placeholder="Leave a comment (optional)..."
              placeholderTextColor={colors.text.tertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />

            <ScalePressable style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#020617" /> : <Text style={styles.submitBtnText}>Submit Review</Text>}
            </ScalePressable>
          </Animated.View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.dark[950] },
  container: { backgroundColor: colors.dark[900], borderTopLeftRadius: borderRadius['3xl'], borderTopRightRadius: borderRadius['3xl'], padding: spacing.xl, paddingBottom: 40, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '900', color: colors.text.primary },
  closeBtn: { padding: spacing.xs, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.full },
  desc: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.xl },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl },
  starBtn: { padding: spacing.xs },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl, padding: spacing.md, color: colors.text.primary, height: 100, marginBottom: spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitBtn: { backgroundColor: colors.primary[500], padding: spacing.md, borderRadius: borderRadius.xl, alignItems: 'center' },
  submitBtnText: { color: colors.dark[950], fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});
