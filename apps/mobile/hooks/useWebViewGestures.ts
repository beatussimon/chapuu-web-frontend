import { useRef } from 'react';
import { Animated, PanResponder, Platform, Vibration, Keyboard } from 'react-native';

export function useWebViewGestures(
  isAtTopRef: React.MutableRefObject<boolean>,
  webViewRef: React.RefObject<any>,
  setShowLoader: (v: boolean) => void,
  loaderOpacity: Animated.Value
) {
  const dragY = useRef(new Animated.Value(0)).current;
  const isRefreshingRef = useRef(false);

  const dragOpacity = dragY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const threshold = Platform.OS === 'ios' ? 15 : 8;
        // Stricter check to NOT hijack horizontal scrolling (like carousels or maps)
        return isAtTopRef.current && gestureState.dy > threshold && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        const threshold = Platform.OS === 'ios' ? 15 : 8;
        return isAtTopRef.current && gestureState.dy > threshold && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderGrant: () => {
        Keyboard.dismiss();
        dragY.setValue(0);
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (isRefreshingRef.current) return;
        const delta = Math.max(0, gestureState.dy);
        const dampened = delta < 60 ? delta : 60 + (delta - 60) * 0.4;
        dragY.setValue(dampened);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (isRefreshingRef.current) return;
        if (gestureState.dy >= 80) {
          isRefreshingRef.current = true;
          Vibration.vibrate(10);
          loaderOpacity.setValue(1);
          dragY.setValue(0);
          setShowLoader(true);
          webViewRef.current?.reload();
        } else {
          Animated.timing(dragY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(dragY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return { panResponder, dragOpacity, isRefreshingRef };
}
