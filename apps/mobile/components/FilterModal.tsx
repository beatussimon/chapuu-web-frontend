import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Platform } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { X, Check, Star, MapPin, Clock, DollarSign } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography, borderRadius } from '../theme';
import ScalePressable, { ScaleIconButton } from './ScalePressable';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { useUser } from '../context/UserContext';

export type SortOption = 'distance' | 'rating' | 'price_asc' | 'price_desc' | 'popular';

export interface FilterState {
  sortBy: SortOption;
  openNow: boolean;
  minRating: number | null;
  storeType: 'ALL' | 'RESTAURANT' | 'SHOP';
}

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export default function FilterModal({ isVisible, onClose, onApply, initialFilters }: FilterModalProps) {
  const { theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.dark[900] : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? 'rgba(255, 255, 255, 0.03)' : '#000000',
    optionActiveBg: theme === 'legacy' ? 'rgba(234, 179, 8, 0.05)' : 'rgba(234, 179, 8, 0.08)',
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const handleApply = () => {
    triggerSelectionHaptic();
    onApply(filters);
    onClose();
  };

  const resetFilters = () => {
    triggerLightHaptic();
    setFilters({
      sortBy: 'popular',
      openNow: false,
      minRating: null,
      storeType: 'ALL'
    });
  };

  const renderSortOption = (label: string, value: SortOption, icon: any) => {
    const Icon = icon;
    const isSelected = filters.sortBy === value;
    return (
      <ScalePressable 
        style={[
          styles.optionRow, 
          isSelected && { backgroundColor: activeColors.optionActiveBg }, 
          { borderBottomColor: activeColors.border }
        ]} 
        onPress={() => { triggerLightHaptic(); setFilters({ ...filters, sortBy: value }); }}
      >
        <View style={styles.optionLabelGroup}>
          <Icon size={18} color={isSelected ? colors.primary[400] : colors.text.tertiary} />
          <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{label}</Text>
        </View>
        {isSelected && <Check size={18} color={colors.primary[400]} />}
      </ScalePressable>
    );
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: activeColors.bg }]}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View entering={SlideInDown.duration(250).springify()} style={[styles.modalContent, { backgroundColor: activeColors.card }]}>
            <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
              <ScaleIconButton onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={colors.text.primary} />
              </ScaleIconButton>
              <Text style={styles.headerTitle}>Filters & Sort</Text>
              <ScalePressable onPress={resetFilters}>
                <Text style={styles.resetText}>Reset</Text>
              </ScalePressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Sort By Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={[styles.optionsContainer, { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
                  {renderSortOption('Most Popular', 'popular', Star)}
                  {renderSortOption('Nearest to Me', 'distance', MapPin)}
                  {renderSortOption('Highest Rated', 'rating', Star)}
                  {renderSortOption('Price: Low to High', 'price_asc', DollarSign)}
                  {renderSortOption('Price: High to Low', 'price_desc', DollarSign)}
                </View>
              </View>

              {/* Status Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>
                <ScalePressable 
                  style={[
                    styles.checkboxRow, 
                    filters.openNow && { backgroundColor: activeColors.optionActiveBg },
                    { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }
                  ]}
                  onPress={() => { triggerLightHaptic(); setFilters({ ...filters, openNow: !filters.openNow }); }}
                >
                  <View style={styles.optionLabelGroup}>
                    <Clock size={18} color={filters.openNow ? colors.primary[400] : colors.text.tertiary} />
                    <Text style={[styles.optionText, filters.openNow && styles.optionTextActive]}>Open Now Only</Text>
                  </View>
                  <View style={[styles.checkbox, { borderColor: activeColors.border }, filters.openNow && styles.checkboxChecked]}>
                    {filters.openNow && <Check size={14} color={colors.dark[950]} />}
                  </View>
                </ScalePressable>
              </View>

              {/* Rating Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Minimum Rating</Text>
                <View style={styles.ratingChips}>
                  {[null, 3, 4, 4.5].map((rating) => (
                    <ScalePressable
                      key={String(rating)}
                      style={[
                        styles.ratingChip, 
                        { backgroundColor: activeColors.inputBg, borderColor: activeColors.border },
                        filters.minRating === rating && styles.ratingChipActive
                      ]}
                      onPress={() => { triggerLightHaptic(); setFilters({ ...filters, minRating: rating }); }}
                    >
                      <Text style={[styles.ratingChipText, filters.minRating === rating && styles.ratingChipTextActive]}>
                        {rating === null ? 'Any' : `${rating}+`}
                      </Text>
                      {rating !== null && <Star size={12} color={filters.minRating === rating ? colors.dark[950] : colors.primary[400]} fill={filters.minRating === rating ? colors.dark[950] : 'transparent'} />}
                    </ScalePressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: activeColors.border }]}>
              <ScalePressable style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </ScalePressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  safeArea: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  resetText: {
    color: colors.primary[400],
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing['2xl'],
  },
  section: {
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  optionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
  },
  optionLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.primary[400],
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  ratingChips: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  ratingChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  ratingChipTextActive: {
    color: colors.dark[950],
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.primary[500],
    height: 56,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  applyBtnText: {
    color: colors.dark[950],
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
