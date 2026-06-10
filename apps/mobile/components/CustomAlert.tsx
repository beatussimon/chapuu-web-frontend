import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableWithoutFeedback
} from 'react-native';
import { X, AlertTriangle, FileText, CheckCircle2, LogOut, Bell } from 'lucide-react-native';
import ScalePressable, { ScaleIconButton } from './ScalePressable';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../hooks/useHaptics';
import { useUser } from '../context/UserContext';

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
  const { theme } = useUser();
  const activeColors = {
    card: theme === 'legacy' ? '#0f172a' : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.16)',
  };

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

  // Helper to determine contextual icon component based on words
  const getIcon = () => {
    const titleLower = config.title.toLowerCase();
    const messageLower = config.message.toLowerCase();
    
    if (titleLower.includes('error') || titleLower.includes('fail')) return AlertTriangle;
    if (titleLower.includes('agreement') || titleLower.includes('required') || titleLower.includes('policy')) return FileText;
    if (titleLower.includes('success') || messageLower.includes('created')) return CheckCircle2;
    if (titleLower.includes('logout') || titleLower.includes('confirm')) return LogOut;
    return Bell;
  };

  const getIconColor = () => {
    const titleLower = config.title.toLowerCase();
    const messageLower = config.message.toLowerCase();
    
    if (titleLower.includes('error') || titleLower.includes('fail')) return '#ef4444'; // red
    if (titleLower.includes('success') || messageLower.includes('created')) return '#22c55e'; // green
    return '#eab308'; // gold/yellow
  };

  const IconComponent = getIcon();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => {}}>
            <View style={[styles.container, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <View style={styles.closeIconBtn}>
                <ScaleIconButton onPress={() => setVisible(false)}>
                  <X size={18} color="rgba(255,255,255,0.4)" />
                </ScaleIconButton>
              </View>

              <View style={[
                styles.iconWrapper,
                config.title.toLowerCase().includes('error') || config.title.toLowerCase().includes('fail')
                  ? styles.iconWrapperError
                  : config.title.toLowerCase().includes('success')
                  ? styles.iconWrapperSuccess
                  : styles.iconWrapperDefault
              ]}>
                <IconComponent size={24} color={getIconColor()} />
              </View>

              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.message}>{config.message}</Text>

              <View style={[
                styles.buttonContainer,
                alertButtons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
              ]}>
                {alertButtons.map((btn, index) => (
                  <ScalePressable
                    key={index}
                    style={[
                      styles.button,
                      alertButtons.length > 2 ? styles.buttonVertical : styles.buttonHorizontal,
                      btn.style === 'cancel' && styles.buttonCancel,
                      btn.style === 'destructive' && styles.buttonDestructive,
                      index === alertButtons.length - 1 && !btn.style && styles.buttonPrimary
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text style={[
                      styles.buttonText,
                      btn.style === 'cancel' && styles.buttonTextCancel,
                      index === alertButtons.length - 1 && !btn.style && styles.buttonTextPrimary
                    ]}>
                      {btn.text}
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    position: 'relative',
  },
  closeIconBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
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
    fontSize: 14,
    color: '#94a3b8', // slate-400
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonVertical: {
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: '#eab308', // Gold primary
  },
  buttonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonTextPrimary: {
    color: '#020617', // dark-950
  },
  buttonTextCancel: {
    color: '#94a3b8', // slate-400
  },
});
