// src/utils/haptics.js

/**
 * Triggers a device vibration if supported.
 * @param {number | number[]} pattern - Duration in ms, or an array of duration/pause/duration...
 */
export const triggerHaptic = (pattern = 50) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
            window.navigator.vibrate(pattern);
        } catch (e) {
            // Ignore error if browser blocks it (e.g. requires user interaction first)
            console.warn('Haptic feedback not supported or blocked', e);
        }
    }
};

export const hapticPatterns = {
    light: 20,
    medium: 40,
    heavy: [60, 30, 60],
    success: [30, 50, 60],
    error: [50, 30, 50, 30, 50]
};
