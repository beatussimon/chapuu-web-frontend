import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScalePressable, { ScaleIconButton } from '../components/ScalePressable';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import WebViewTab from '../components/WebViewTab';
import { useUser } from '../context/UserContext';

export default function MoreModalScreen() {
  const { path, title } = useLocalSearchParams<{ path: string; title: string }>();
  const { theme } = useUser();
  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.16)',
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderColor: activeColors.border }]}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Tool'}
        </Text>
        <ScaleIconButton style={styles.closeButton} onPress={handleClose}>
          <X size={20} color="#ffffff" />
        </ScaleIconButton>
      </View>

      <View style={styles.content}>
        {path ? (
          <WebViewTab path={path} />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Invalid path specified.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // bg-dark-950
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
