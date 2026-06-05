import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────────────────────
// ScalePressable — Primary pressable with spring-back scale feedback.
// Runs entirely on the UI thread via Reanimated — zero JS-thread jank.
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ScalePressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

export default function ScalePressable({
  children,
  style,
  scaleTo = 0.96,
  ...props
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withTiming(scaleTo, {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });
    if (props.onPressIn) props.onPressIn(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 200,
      mass: 0.6,
    });
    if (props.onPressOut) props.onPressOut(event);
  };

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScaleIconButton — Lighter scale variant for icon-only buttons.
// Stronger scale-down (0.82) gives the physical "click" sensation on small targets.
// ─────────────────────────────────────────────────────────────────────────────

interface ScaleIconButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScaleIconButton({
  children,
  style,
  ...props
}: ScaleIconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withTiming(0.82, {
      duration: 70,
      easing: Easing.out(Easing.quad),
    });
    if (props.onPressIn) props.onPressIn(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, {
      damping: 18,
      stiffness: 250,
      mass: 0.5,
    });
    if (props.onPressOut) props.onPressOut(event);
  };

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {children}
    </AnimatedPressable>
  );
}
