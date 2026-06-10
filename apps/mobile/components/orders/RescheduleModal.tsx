import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Platform, TouchableWithoutFeedback } from 'react-native';
import ScalePressable, { ScaleIconButton } from '../../components/ScalePressable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Clock, AlertCircle } from 'lucide-react-native';
import apiClient from '../../services/api';
import { CustomAlert } from '../CustomAlert';
import { colors, spacing, borderRadius } from '../../theme';
import { useUser } from '../../context/UserContext';

interface RescheduleModalProps {
  visible: boolean;
  orderId: string | number;
  currentScheduledTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleModal({ visible, orderId, currentScheduledTime, onClose, onSuccess }: RescheduleModalProps) {
  const { theme } = useUser();
  const activeColors = {
    overlayBg: theme === 'legacy' ? 'rgba(2, 6, 23, 0.85)' : 'rgba(0, 0, 0, 0.9)',
    card: theme === 'legacy' ? colors.dark[900] : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? 'rgba(255,255,255,0.05)' : '#000000',
  };

  const [newTime, setNewTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiClient.post(`/orders/${orderId}/reschedule/`, {
        scheduled_time: newTime.toISOString(),
      });
      CustomAlert.alert("Request Sent", "Your reschedule request has been submitted for approval.");
      onSuccess();
    } catch (err: any) {
      CustomAlert.alert("Failed", err?.response?.data?.error || "Could not reschedule.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: activeColors.overlayBg }]}>
          <TouchableWithoutFeedback onPress={(e) => {}}>
            <View style={[styles.container, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <View style={styles.header}>
                <Text style={styles.title}>Reschedule Order</Text>
                <ScaleIconButton onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={colors.text.secondary} />
                </ScaleIconButton>
              </View>

              <View style={[styles.currentBox, { borderColor: activeColors.border }]}>
                <Text style={styles.label}>Current Time</Text>
                <Text style={styles.value}>{new Date(currentScheduledTime).toLocaleString()}</Text>
              </View>

              <Text style={styles.label}>Select New Time</Text>
              {(showPicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={newTime}
                  mode="datetime"
                  minimumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, date) => {
                    if (Platform.OS !== 'ios') setShowPicker(false);
                    if (date) setNewTime(date);
                  }}
                  textColor={colors.text.primary}
                />
              )}

              {!showPicker && Platform.OS !== 'ios' && (
                <ScalePressable style={[styles.timeBtn, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} onPress={() => setShowPicker(true)}>
                  <Clock size={16} color={colors.text.secondary} />
                  <Text style={styles.timeBtnText}>{newTime.toLocaleString()}</Text>
                </ScalePressable>
              )}

              <View style={styles.warningBox}>
                <AlertCircle size={16} color="#fbbf24" />
                <Text style={styles.warningText}>This change requires store approval. If rejected, the original time stands.</Text>
              </View>

              <View style={styles.btnRow}>
                <ScalePressable style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </ScalePressable>
                <ScalePressable style={[styles.btn, styles.submitBtn]} onPress={handleSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#020617" /> : <Text style={styles.submitBtnText}>Confirm Change</Text>}
                </ScalePressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.dark[950], justifyContent: 'center', padding: spacing.xl },
  container: { backgroundColor: colors.dark[900], borderRadius: borderRadius['2xl'], padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '900', color: colors.text.primary, textTransform: 'uppercase' },
  closeBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.full },
  currentBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: spacing.md, borderRadius: borderRadius.xl, marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  label: { fontSize: 12, fontWeight: 'bold', color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 },
  value: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  timeBtnText: { fontSize: 14, color: colors.text.primary, fontWeight: '600' },
  warningBox: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(251, 191, 36, 0.05)', padding: spacing.md, borderRadius: borderRadius.lg, marginVertical: spacing.lg },
  warningText: { flex: 1, fontSize: 12, color: '#fbbf24', lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  btn: { flex: 1, height: 50, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: colors.text.secondary, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary[500] },
  submitBtnText: { color: colors.dark[950], fontWeight: '900', textTransform: 'uppercase' }
});
