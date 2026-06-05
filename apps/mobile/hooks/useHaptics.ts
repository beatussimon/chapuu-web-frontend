import { Platform, Vibration } from 'react-native';

// Dynamic require to prevent compiler errors if node_modules package resolution is absent in current host run
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Silent fallback to standard Vibration
}

// ─────────────────────────────────────────────────────────────────────────────
// Haptic hierarchy (use the right weight for the action):
//
//  NONE         — Pure navigation taps (back, close) — no haptic, just animate
//  SELECTION    — Toggle-like state changes (save, tab switch, checkbox)
//  LIGHT        — Confirmations of minor actions (pull-to-refresh, filter chip)
//  MEDIUM       — Substantive actions (add to cart, expand section)
//  HEAVY        — Destructive or irreversible actions (delete item, clear cart)
//  NOTIFICATION — Form submission outcomes (success, warning, error)
// ─────────────────────────────────────────────────────────────────────────────

/** Toggle-like selections: favorites, tab switches, checkboxes */
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

/** Minor tap confirmations: filter chips, pull-to-refresh, small form interactions */
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

/** Substantive actions: add to cart, start checkout, confirm a choice */
export function triggerMediumHaptic() {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Vibration.vibrate(18);
    }
  } catch (e) {
    Vibration.vibrate(18);
  }
}

/** Destructive actions: delete item from cart, clear all, irreversible removes */
export function triggerHeavyHaptic() {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } else {
      Vibration.vibrate([0, 30]);
    }
  } catch (e) {
    Vibration.vibrate([0, 30]);
  }
}

/** Form submission outcomes */
export function triggerNotificationHaptic(type: 'success' | 'warning' | 'error' = 'success') {
  if (Platform.OS === 'web') return;
  try {
    if (Haptics) {
      if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      else if (type === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else {
      Vibration.vibrate([0, 10, 50, 10]);
    }
  } catch (e) {
    Vibration.vibrate([0, 10, 50, 10]);
  }
}

/** Convenience: order placed, login success, reservation confirmed */
export function triggerSuccessHaptic() {
  triggerNotificationHaptic('success');
}

/** Convenience: login failed, form validation error */
export function triggerErrorHaptic() {
  triggerNotificationHaptic('error');
}
