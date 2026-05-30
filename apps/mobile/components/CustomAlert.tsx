import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native';
import ScalePressable from './ScalePressable';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../hooks/useHaptics';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertConfig = {
  title: string;
  message: string;
  buttons?: AlertButton[];
};

let alertShowCallback: ((config: AlertConfig) => void) | null = null;

export const CustomAlert = {
  alert: (title: string, message: string, buttons?: AlertButton[]) => {
    if (alertShowCallback) {
      alertShowCallback({ title, message, buttons });
    } else {
      // Fallback in case the provider hasn't mounted
      triggerLightHaptic();
      console.warn('[CustomAlert] Provider not active. Alert:', { title, message });
    }
  }
};

export default function CustomAlertModal() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    buttons: []
  });

  useEffect(() => {
    alertShowCallback = (newConfig) => {
      // Detect type of alert and play corresponding haptic pattern
      const titleLower = newConfig.title.toLowerCase();
      const messageLower = newConfig.message.toLowerCase();
      
      const isError = titleLower.includes('error') || 
                      titleLower.includes('fail') || 
                      titleLower.includes('required');
      
      const isSuccess = titleLower.includes('success') || 
                        titleLower.includes('confirm') || 
                        messageLower.includes('create') ||
                        messageLower.includes('success');
      
      if (isError) {
        triggerErrorHaptic();
      } else if (isSuccess) {
        triggerSuccessHaptic();
      } else {
        triggerLightHaptic();
      }

      setConfig(newConfig);
      setVisible(true);
    };

    return () => {
      alertShowCallback = null;
    };
  }, []);

  const handleButtonPress = (btn: AlertButton) => {
    triggerLightHaptic();
    setVisible(false);
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const alertButtons = config.buttons && config.buttons.length > 0 
    ? config.buttons 
    : [{ text: 'OK' }];

  // Helper to determine contextual emoji/icon based on words
  const getIcon = () => {
    const titleLower = config.title.toLowerCase();
    const messageLower = config.message.toLowerCase();
    
    if (titleLower.includes('error') || titleLower.includes('fail')) return '⚠️';
    if (titleLower.includes('agreement') || titleLower.includes('required') || titleLower.includes('policy')) return '✍️';
    if (titleLower.includes('success') || messageLower.includes('created')) return '✅';
    if (titleLower.includes('logout') || titleLower.includes('confirm')) return '🚪';
    return '🔔';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={[
            styles.iconWrapper,
            config.title.toLowerCase().includes('error') || config.title.toLowerCase().includes('fail')
              ? styles.iconWrapperError
              : config.title.toLowerCase().includes('success')
              ? styles.iconWrapperSuccess
              : styles.iconWrapperDefault
          ]}>
            <Text style={styles.icon}>{getIcon()}</Text>
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>

          <View style={[
            styles.buttonContainer,
            alertButtons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
          ]}>
            {alertButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              // Determine styles
              let btnStyle: StyleProp<ViewStyle> = styles.defaultButton;
              let txtStyle: StyleProp<TextStyle> = styles.defaultButtonText;

              if (isDestructive) {
                btnStyle = styles.destructiveButton;
                txtStyle = styles.destructiveButtonText;
              } else if (isCancel) {
                btnStyle = styles.cancelButton;
                txtStyle = styles.cancelButtonText;
              } else {
                // Primary action styles
                if (alertButtons.length === 2 && index === 1) {
                  btnStyle = styles.primaryButton;
                  txtStyle = styles.primaryButtonText;
                } else if (alertButtons.length === 1) {
                  btnStyle = styles.primaryButton;
                  txtStyle = styles.primaryButtonText;
                }
              }

              return (
                <ScalePressable
                  key={index}
                  style={[styles.button, btnStyle]}
                  onPress={() => handleButtonPress(btn)}
                >
                  <Text style={[styles.buttonText, txtStyle]}>{btn.text}</Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)', // dark-950 transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#0f172a', // bg-dark-900
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapperDefault: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)', // Gold atmospheric tint
  },
  iconWrapperError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red tint
  },
  iconWrapperSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // Green tint
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 13,
    color: '#94a3b8', // slate-400
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: '#eab308', // Gold primary
  },
  primaryButtonText: {
    color: '#020617', // Dark slate text
  },
  destructiveButton: {
    backgroundColor: '#ef4444', // Warning red solid
  },
  destructiveButtonText: {
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelButtonText: {
    color: '#64748b', // Slate gray cancel text
  },
  defaultButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  defaultButtonText: {
    color: '#ffffff',
  },
});
