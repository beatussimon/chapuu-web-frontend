import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import LoadingSkeleton from './LoadingSkeleton';

export default function SkeletonOrderCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <LoadingSkeleton style={styles.icon} />
        </View>
        <View style={styles.headerText}>
          <LoadingSkeleton style={styles.title} />
          <LoadingSkeleton style={styles.date} />
        </View>
        <LoadingSkeleton style={styles.badge} />
      </View>
      <View style={styles.divider} />
      <LoadingSkeleton style={styles.details} />
      <LoadingSkeleton style={styles.detailsShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBox: {
    marginRight: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    width: '70%',
    height: 20,
    marginBottom: 6,
  },
  date: {
    width: '40%',
    height: 14,
  },
  badge: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: spacing.md,
  },
  details: {
    width: '100%',
    height: 16,
    marginBottom: 8,
  },
  detailsShort: {
    width: '60%',
    height: 16,
  },
});
