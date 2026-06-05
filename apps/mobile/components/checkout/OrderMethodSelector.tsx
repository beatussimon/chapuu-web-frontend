import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScalePressable from '../ScalePressable';
import { MapPin, ShoppingBag, Utensils } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { triggerLightHaptic } from '../../hooks/useHaptics';

interface OrderMethodSelectorProps {
  selectedMethod: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  onMethodSelect: (method: 'DELIVERY' | 'PICKUP' | 'DINE_IN') => void;
  activeReservation: number | null;
}

export function OrderMethodSelector({
  selectedMethod,
  onMethodSelect,
  activeReservation
}: OrderMethodSelectorProps) {
  
  const methods: { id: 'DELIVERY' | 'PICKUP' | 'DINE_IN'; name: string; icon: any; badge?: string | null }[] = [
    { id: 'DELIVERY', name: 'Delivery', icon: MapPin },
    { id: 'PICKUP', name: 'Pick Up', icon: ShoppingBag },
    { id: 'DINE_IN', name: 'Dine-In', icon: Utensils, badge: activeReservation ? 'Reserved' : null },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Order Method</Text>
      <View style={styles.selectorRow}>
        {methods.map(method => (
          <ScalePressable
            key={method.id}
            style={[styles.methodBtn, selectedMethod === method.id && styles.methodBtnActive]}
            onPress={() => {
              triggerLightHaptic();
              onMethodSelect(method.id);
            }}
          >
            <method.icon size={20} color={selectedMethod === method.id ? colors.primary[500] : colors.text.secondary} />
            <Text style={[styles.methodText, selectedMethod === method.id && styles.methodTextActive]}>
              {method.name}
            </Text>
            {method.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{method.badge}</Text>
              </View>
            )}
          </ScalePressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    position: 'relative',
  },
  methodBtnActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: colors.primary[500],
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  methodTextActive: {
    color: colors.primary[400],
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
    textTransform: 'uppercase',
  },
});
