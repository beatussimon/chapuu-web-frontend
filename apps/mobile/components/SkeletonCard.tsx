import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import LoadingSkeleton from './LoadingSkeleton';

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      <LoadingSkeleton style={styles.image} />
      <View style={styles.content}>
        <LoadingSkeleton style={styles.title} />
        <LoadingSkeleton style={styles.subtitle} />
        <LoadingSkeleton style={styles.tags} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  image: {
    width: '100%',
    height: 180,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    width: '60%',
    height: 24,
    marginBottom: spacing.sm,
  },
  subtitle: {
    width: '40%',
    height: 16,
    marginBottom: spacing.md,
  },
  tags: {
    width: '80%',
    height: 20,
  },
});
