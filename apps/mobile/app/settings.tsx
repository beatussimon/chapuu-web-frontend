import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Shield, Smartphone, Trash2, ChevronRight, Globe, Moon } from 'lucide-react-native';

import { useUser } from '../context/UserContext';
import { colors, spacing, borderRadius } from '../theme';
import ScalePressable from '../components/ScalePressable';
import { triggerLightHaptic, triggerSelectionHaptic } from '../hooks/useHaptics';
import { CustomAlert } from '../components/CustomAlert';

export default function SettingsScreen() {
  const router = useRouter();
  const { userRole, updateUser, theme, updateTheme } = useUser();
  
  const [notifications, setNotifications] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const activeColors = {
    bg: theme === 'legacy' ? '#020617' : '#000000',
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    rowBorder: theme === 'legacy' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.06)',
  };

  const handleDeleteAccount = () => {
    triggerSelectionHaptic();
    CustomAlert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            // Implementation would call API
            CustomAlert.alert("Account Deleted", "Your account has been removed.");
            updateUser('CUSTOMER', null, null);
            router.replace('/');
          } 
        }
      ]
    );
  };

  const renderSettingRow = (icon: any, label: string, value: boolean, onToggle: (v: boolean) => void) => {
    const Icon = icon;
    return (
      <View style={[styles.settingRow, { borderBottomColor: activeColors.rowBorder }]}>
        <View style={styles.settingLabelGroup}>
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
            <Icon size={20} color={colors.text.secondary} />
          </View>
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={(v) => { triggerLightHaptic(); onToggle(v); }}
          trackColor={{ false: '#1e293b', true: colors.primary[600] }}
          thumbColor={value ? colors.primary[400] : '#64748b'}
        />
      </View>
    );
  };

  const renderLinkRow = (icon: any, label: string, onPress: () => void, color = colors.text.primary) => {
    const Icon = icon;
    return (
      <ScalePressable style={[styles.settingRow, { borderBottomColor: activeColors.rowBorder }]} onPress={() => { triggerLightHaptic(); onPress(); }}>
        <View style={styles.settingLabelGroup}>
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
            <Icon size={20} color={color === colors.text.primary ? colors.text.secondary : color} />
          </View>
          <Text style={[styles.settingLabel, { color }]}>{label}</Text>
        </View>
        <ChevronRight size={18} color="#475569" />
      </ScalePressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <ScalePressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text.secondary} />
        </ScalePressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={[styles.sectionCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            {renderSettingRow(Bell, "Push Notifications", notifications, setNotifications)}
            {renderSettingRow(Smartphone, "Order Updates", true, () => {})}
            {renderSettingRow(Globe, "Marketing Emails", marketing, setMarketing)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance & App</Text>
          <View style={[styles.sectionCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            {renderSettingRow(Moon, "Dark Mode (OLED Black)", theme === 'dark', (val) => {
              updateTheme(val ? 'dark' : 'legacy');
            })}
            {renderLinkRow(Globe, "Language", () => {}, colors.text.secondary)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={[styles.sectionCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            {renderLinkRow(Shield, "Privacy Policy", () => router.push({ pathname: '/more', params: { path: '/privacy', title: 'Privacy Policy' } }))}
            {renderLinkRow(Shield, "Terms of Service", () => router.push({ pathname: '/more', params: { path: '/terms', title: 'Terms of Service' } }))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={[styles.sectionCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            {renderLinkRow(Trash2, "Delete Account", handleDeleteAccount, colors.error)}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Chapuu Mobile v1.0.2</Text>
          <Text style={styles.copyrightText}>© 2026 Chapuu Technologies</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backBtn: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '700',
  },
  copyrightText: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
});
