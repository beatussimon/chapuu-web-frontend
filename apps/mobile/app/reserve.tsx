import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Users, MapPin, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import apiClient from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import ScalePressable from '../components/ScalePressable';
import { triggerLightHaptic, triggerNotificationHaptic } from '../hooks/useHaptics';
import { CustomAlert } from '../components/CustomAlert';
import { useUser } from '../context/UserContext';

export default function ReservationScreen() {
  const router = useRouter();
  const { theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? colors.dark[900] : '#121212',
  };

  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [guests, setGuests] = useState(2);
  const [duration, setDuration] = useState(60);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [confirmedRes, setConfirmedRes] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/stores/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const restaurantStores = data.filter((s: any) => s.store_type === 'RESTAURANT');
        setStores(restaurantStores);
        if (restaurantStores.length > 0) setSelectedStore(restaurantStores[0].id);
      })
      .catch(err => console.warn(err))
      .finally(() => setLoading(false));
  }, []);

  const handleReserve = async () => {
    if (!selectedStore) {
      CustomAlert.alert("Missing", "Please select a restaurant.");
      return;
    }

    // Combine date and time
    const reservationDate = new Date(date);
    reservationDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

    if (reservationDate < new Date()) {
      CustomAlert.alert("Invalid Time", "Cannot book in the past!");
      return;
    }

    triggerLightHaptic();
    setSubmitting(true);
    
    try {
      const payload = {
        store: selectedStore,
        reservation_time: reservationDate.toISOString(),
        duration_minutes: duration,
        guest_count: guests
      };

      const res = await apiClient.post('/reservations/', payload);
      triggerNotificationHaptic('success');
      setConfirmedRes(res.data);
    } catch (err: any) {
      triggerNotificationHaptic('error');
      CustomAlert.alert("Booking Failed", err?.response?.data?.detail || err?.response?.data?.error || "Could not complete reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedRes) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
        <View style={styles.centerBox}>
          <View style={styles.successIconWrapper}>
            <CheckCircle2 size={64} color={colors.primary[500]} />
          </View>
          <Text style={styles.successTitle}>Reservation Submitted!</Text>
          <Text style={styles.successDesc}>Your table request has been sent to the restaurant for confirmation.</Text>
          
          <View style={[styles.detailsCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            <View style={[styles.detailRow, { borderBottomColor: activeColors.border }]}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{new Date(confirmedRes.reservation_time).toLocaleString()}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: activeColors.border }]}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{confirmedRes.guest_count} People</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: activeColors.border }]}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, { color: colors.primary[400] }]}>Pending Approval</Text>
            </View>
          </View>

          <ScalePressable style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/tab4')}>
            <Text style={styles.primaryBtnText}>Track Status in Orders</Text>
          </ScalePressable>
          <ScalePressable style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: activeColors.border, marginTop: spacing.md }]} onPress={() => router.back()}>
            <Text style={[styles.primaryBtnText, { color: colors.text.primary }]}>Go Back</Text>
          </ScalePressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
        <ScalePressable style={[styles.headerIconBtn, { backgroundColor: activeColors.border }]} onPress={() => { triggerLightHaptic(); router.back(); }}>
          <ArrowLeft size={20} color={colors.text.secondary} />
        </ScalePressable>
        <Text style={styles.headerTitle}>Reserve a Table</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.scrollArea}>
            <View style={[styles.formSection, { margin: spacing.xl, backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <LoadingSkeleton style={{ width: '100%', height: 60, marginBottom: spacing.lg }} />
              <LoadingSkeleton style={{ width: '100%', height: 48, marginBottom: spacing.lg }} />
              <LoadingSkeleton style={{ width: '100%', height: 48, marginBottom: spacing.lg }} />
              <LoadingSkeleton style={{ width: '100%', height: 80 }} />
            </View>
          </View>
        ) : (
          <KeyboardAwareScrollView bottomOffset={20} keyboardDismissMode="on-drag" style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            
            <View style={[styles.formSection, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Restaurant</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeScroll}>
                  {stores.map(store => (
                    <ScalePressable 
                      key={store.id} 
                      style={[styles.storeChip, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }, selectedStore === store.id && styles.storeChipActive]}
                      onPress={() => { triggerLightHaptic(); setSelectedStore(store.id); }}
                    >
                      <MapPin size={14} color={selectedStore === store.id ? colors.dark[950] : colors.text.secondary} />
                      <Text style={[styles.storeChipText, selectedStore === store.id && styles.storeChipTextActive]}>{store.name}</Text>
                    </ScalePressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.rowGroup}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Date</Text>
                  <ScalePressable style={[styles.inputBtn, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} onPress={() => setShowDatePicker(true)}>
                    <CalendarIcon size={18} color={colors.text.tertiary} />
                    <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
                  </ScalePressable>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Time</Text>
                  <ScalePressable style={[styles.inputBtn, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} onPress={() => setShowTimePicker(true)}>
                    <Clock size={18} color={colors.text.tertiary} />
                    <Text style={styles.inputText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </ScalePressable>
                </View>
              </View>

              {(showDatePicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(e, d) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (d) setDate(d);
                  }}
                />
              )}

              {(showTimePicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="default"
                  onChange={(e, t) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (t) setTime(t);
                  }}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Guests</Text>
                <View style={[styles.stepperContainer, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
                  <ScalePressable style={styles.stepperBtn} onPress={() => { triggerLightHaptic(); setGuests(Math.max(1, guests - 1)); }}>
                    <Text style={styles.stepperBtnText}>-</Text>
                  </ScalePressable>
                  <View style={styles.stepperValueBox}>
                    <Users size={16} color={colors.primary[500]} />
                    <Text style={styles.stepperValueText}>{guests} People</Text>
                  </View>
                  <ScalePressable style={styles.stepperBtn} onPress={() => { triggerLightHaptic(); setGuests(guests + 1); }}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </ScalePressable>
                </View>
              </View>
              
            </View>
          </KeyboardAwareScrollView>
        )}

        <View style={[styles.footer, { borderTopColor: activeColors.border }]}>
          <ScalePressable style={[styles.primaryBtn, submitting && { opacity: 0.7 }]} onPress={handleReserve} disabled={submitting || loading}>
            {submitting ? <ActivityIndicator color={colors.dark[950]} /> : (
              <Text style={styles.primaryBtnText}>Confirm Reservation</Text>
            )}
          </ScalePressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerIconBtn: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.text.primary },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  
  formSection: { backgroundColor: colors.surfaceHighlight, padding: spacing.lg, borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputGroup: { marginBottom: spacing.lg },
  rowGroup: { flexDirection: 'row', gap: spacing.md },
  label: { fontSize: 12, fontWeight: 'bold', color: colors.text.secondary, textTransform: 'uppercase', marginBottom: spacing.xs },
  
  storeScroll: { flexDirection: 'row', marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  storeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dark[900], paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: spacing.sm },
  storeChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[600] },
  storeChipText: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
  storeChipTextActive: { color: colors.dark[950] },
  
  inputBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dark[900], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, height: 48 },
  inputText: { fontSize: 14, color: colors.text.primary, fontWeight: 'bold' },
  
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.dark[900], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl, overflow: 'hidden' },
  stepperBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  stepperBtnText: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  stepperValueBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperValueText: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  primaryBtn: { backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.xl, width: '100%' },
  primaryBtnText: { color: colors.dark[950], fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },

  successIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.text.primary, marginBottom: spacing.xs },
  successDesc: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing['2xl'] },
  detailsCard: { backgroundColor: colors.surfaceHighlight, padding: spacing.lg, borderRadius: borderRadius.xl, width: '100%', marginBottom: spacing['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { fontSize: 14, color: colors.text.secondary },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary }
});
