import { Platform, Vibration } from 'react-native';

// Dynamic require to prevent compiler errors if node_modules package resolution is absent in current host run
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Silent fallback to standard Vibration
}

export function triggerSelectionHaptic() {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      Haptics.selectionAsync().catch(() => {});
    } else {
      Vibration.vibrate(8);
    }
  } catch (e) {
    Vibration.vibrate(8);
  }
}

export function triggerLightHaptic() {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Vibration.vibrate(10);
    }
  } catch (e) {
    Vibration.vibrate(10);
  }
}

export function triggerSuccessHaptic() {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Vibration.vibrate([0, 10, 50, 10]);
    }
  } catch (e) {
    Vibration.vibrate([0, 10, 50, 10]);
  }
}

export function triggerErrorHaptic() {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else {
      Vibration.vibrate([0, 15, 60, 15]);
    }
  } catch (e) {
    Vibration.vibrate([0, 15, 60, 15]);
  }
}
