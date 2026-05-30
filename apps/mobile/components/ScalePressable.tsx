import React, { useRef } from 'react';
import { Pressable, Animated, PressableProps, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';

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
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    Animated.timing(scale, {
      toValue: scaleTo,
      duration: 100,
      useNativeDriver: true,
    }).start();
    if (props.onPressIn) props.onPressIn(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
    if (props.onPressOut) props.onPressOut(event);
  };

  return (
    <Pressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
