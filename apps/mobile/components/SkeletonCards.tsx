/**
 * SkeletonCard — Placeholder that matches StoreCard / product card dimensions.
 * Use during initial data fetch instead of an ActivityIndicator.
 *
 * Usage:
 *   if (loading) {
 *     return <SkeletonStoreList count={4} />;
 *   }
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';

// ─── Primitive Bone ────────────────────────────────────────────────────────

interface BoneProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
}

function Bone({ width = '100%', height = 14, radius = 8, style }: BoneProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 750 }),
        withTiming(0.35, { duration: 750 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceHighlight,
        },
        style,
        animStyle,
      ]}
    />
  );
}

// ─── Store Card Skeleton ───────────────────────────────────────────────────

export function SkeletonStoreCard() {
  return (
    <View style={styles.card}>
      {/* Hero image */}
      <Bone width="100%" height={160} radius={0} style={styles.cardImage} />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Bone width="70%" height={18} radius={6} style={{ marginBottom: 8 }} />
        {/* Subtitle row */}
        <Bone width="45%" height={12} radius={4} style={{ marginBottom: 16 }} />
        {/* Footer row */}
        <View style={styles.footerRow}>
          <Bone width={80} height={12} radius={4} />
          <Bone width={48} height={12} radius={4} />
        </View>
      </View>
    </View>
  );
}

/** Renders `count` store card skeletons */
export function SkeletonStoreList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStoreCard key={i} />
      ))}
    </>
  );
}

// ─── Order Card Skeleton ───────────────────────────────────────────────────

export function SkeletonOrderCard() {
  return (
    <View style={styles.orderCard}>
      {/* Header row: order ID + status pill */}
      <View style={styles.orderHeaderRow}>
        <Bone width="40%" height={16} radius={5} />
        <Bone width={72} height={22} radius={6} />
      </View>

      {/* Store name */}
      <Bone width="55%" height={13} radius={4} style={{ marginTop: 10, marginBottom: 6 }} />

      {/* Date */}
      <Bone width="38%" height={11} radius={4} style={{ marginBottom: 16 }} />

      {/* Footer: price + button */}
      <View style={styles.footerRow}>
        <Bone width={90} height={18} radius={5} />
        <Bone width={64} height={30} radius={10} />
      </View>
    </View>
  );
}

/** Renders `count` order card skeletons */
export function SkeletonOrderList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOrderCard key={i} />
      ))}
    </View>
  );
}

// ─── Search Result Skeleton ────────────────────────────────────────────────

export function SkeletonSearchResult() {
  return (
    <View style={styles.searchRow}>
      <Bone width={64} height={64} radius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <Bone width="65%" height={15} radius={5} />
        <Bone width="40%" height={11} radius={4} />
        <Bone width="30%" height={11} radius={4} />
      </View>
    </View>
  );
}

export function SkeletonSearchList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ padding: spacing.md, gap: spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSearchResult key={i} />
      ))}
    </View>
  );
}

// ─── Favorites Skeleton ────────────────────────────────────────────────────

export function SkeletonFavoriteList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStoreCard key={i} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardImage: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  cardContent: {
    padding: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginTop: spacing.xs,
  },
  orderCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing.lg,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
});
