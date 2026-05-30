import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import ScalePressable from './ScalePressable';
import { triggerLightHaptic } from '../hooks/useHaptics';

interface OfflineScreenProps {
  onRetry: () => void;
}

export default function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const handleRetryPress = () => {
    triggerLightHaptic();
    onRetry();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <WifiOff size={48} color="#eab308" />
      </View>
      <Text style={styles.title}>Connection Lost</Text>
      <Text style={styles.description}>
        We couldn't connect to Chapuu. Please verify your internet connection and try again.
      </Text>
      <ScalePressable 
        style={styles.retryButton} 
        onPress={handleRetryPress}
      >
        <Text style={styles.retryText}>TRY AGAIN</Text>
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Matching dark-950
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.15)',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: '#eab308',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  retryText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
