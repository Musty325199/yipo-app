import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { Button } from '@/components/ui/button';
import { LockIcon, InfoIcon } from '@/components/ui/icons';
import {
  isAppLockEnabled,
  setAppLockEnabled,
  hasBiometricHardware,
  authenticateWithBiometrics,
  getAppSetting,
  setAppSetting,
} from '@/utils/security';
import { exportJsonBackup, restoreJsonBackup } from '@/utils/backup';
import { exportAllRecordsToCSV } from '@/utils/csv';
import { usePlus, PlusBadge } from '@/utils/plus';

export default function SettingsScreen() {
  const {
    colors,
    typography,
    spacing,
    radii,
    isDark,
    themePreference,
    setThemePreference,
  } = useTheme();

  const { isPlus, togglePlus } = usePlus();
  const [organizerName, setOrganizerName] = useState('Organizer name');
  const [lockEnabled, setLockEnabled] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => {
    (async () => {
      const enabled = await isAppLockEnabled();
      setLockEnabled(enabled);

      const bio = await hasBiometricHardware();
      setHasBiometrics(bio);

      const name = await getAppSetting('organizer_name', 'Organizer name');
      setOrganizerName(name);
    })();
  }, []);

  const handleOrganizerNameChange = (val: string) => {
    setOrganizerName(val);
    setAppSetting('organizer_name', val.trim() || 'Organizer name').catch(() => {});
  };

  const handleToggleLock = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      // Test biometric authentication before enabling
      const success = await authenticateWithBiometrics('Confirm Biometric / PIN to enable App Lock');
      if (success) {
        await setAppLockEnabled(true);
        setLockEnabled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Authentication Required', 'Could not enable app lock without authentication.');
      }
    } else {
      await setAppLockEnabled(false);
      setLockEnabled(false);
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await exportJsonBackup();
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Export Failed', res.error || 'Unable to export backup.');
      }
    } finally {
      setExportingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      'Restore Database Backup?',
      'Restoring from a backup will replace your current records with the data in the backup file. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File & Restore',
          style: 'destructive',
          onPress: async () => {
            setRestoringBackup(true);
            try {
              const res = await restoreJsonBackup();
              if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Restore Successful!',
                  `Successfully restored ${res.restoredGroupsCount} Ajo group(s).`
                );
              } else if (res.error !== 'File selection canceled') {
                Alert.alert('Restore Failed', res.error || 'Unable to restore backup.');
              }
            } finally {
              setRestoringBackup(false);
            }
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    setExportingCsv(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await exportAllRecordsToCSV();
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Export Failed', res.error || 'Unable to generate CSV.');
      }
    } finally {
      setExportingCsv(false);
    }
  };

  interface ThemeOption {
    key: 'system' | 'light' | 'dark';
    label: string;
  }

  const themeOptions: ThemeOption[] = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { marginVertical: spacing.lg }]}>
          <Text
            style={[
              styles.screenTitle,
              { color: colors.ink, fontFamily: typography.headingFont },
            ]}>
            Settings
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            Preferences, security, and offline data backups
          </Text>
        </View>

        {/* Yípo Plus Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.muted, fontFamily: typography.bodyMediumFont },
              ]}>
              YÍPO PLUS
            </Text>
            <PlusBadge />
          </View>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
              },
            ]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: colors.ink, fontFamily: typography.headingSemiBoldFont, fontSize: 16 },
                    ]}>
                    Launch Edition
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                      borderRadius: radii.pill,
                    }}>
                    <Text
                      style={{
                        color: colors.paid,
                        fontFamily: typography.headingSemiBoldFont,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                      Free during launch
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: typography.bodyFont,
                    fontSize: 13,
                    marginTop: 4,
                  }}>
                  All premium offline features are fully unlocked for early organizers.
                </Text>
              </View>

              <Switch
                value={isPlus}
                onValueChange={togglePlus}
                trackColor={{ false: colors.line, true: colors.accent }}
                thumbColor={isDark ? colors.surface : '#FFFFFF'}
              />
            </View>

            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.line,
                gap: 6,
              }}>
              <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 12 }}>
                • Unlimited active savings groups
              </Text>
              <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 12 }}>
                • Professional A4 PDF statements & receipts
              </Text>
              <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 12 }}>
                • Late fee rules per group with waiver records
              </Text>
              <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 12 }}>
                • Bulk WhatsApp reminder queue
              </Text>
            </View>
          </View>
        </View>

        {/* Organizer Profile Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            ORGANIZER PROFILE
          </Text>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
              },
            ]}>
            <Text
              style={[
                styles.settingLabel,
                { color: colors.ink, fontFamily: typography.bodyMediumFont, marginBottom: 4 },
              ]}>
              Organizer name
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: typography.bodyFont,
                fontSize: 12,
                marginBottom: spacing.sm,
              }}>
              Printed on A4 statement headers and receipts
            </Text>
            <TextInput
              value={organizerName}
              onChangeText={handleOrganizerNameChange}
              placeholder="Organizer name"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.line,
                borderWidth: 1,
                borderRadius: radii.card,
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.md,
                color: colors.ink,
                fontFamily: typography.bodyFont,
                fontSize: 14,
              }}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            APPEARANCE
          </Text>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
              },
            ]}>
            <Text
              style={[
                styles.settingLabel,
                { color: colors.ink, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
              ]}>
              Theme preference
            </Text>

            <View style={[styles.pillContainer, { backgroundColor: colors.bg, borderRadius: radii.pill, padding: 3 }]}>
              {themeOptions.map((opt) => {
                const isActive = themePreference === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setThemePreference(opt.key);
                    }}
                    style={[
                      styles.pillButton,
                      {
                        backgroundColor: isActive ? colors.surface : 'transparent',
                        borderRadius: radii.pill,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: isActive ? colors.ink : colors.muted,
                          fontFamily: isActive
                            ? typography.bodySemiBoldFont
                            : typography.bodyFont,
                        },
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            SECURITY & PRIVACY
          </Text>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
              },
            ]}>
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: colors.bg, borderRadius: 10 }]}>
                <LockIcon size={20} color={colors.accentText} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  App Lock
                </Text>
                <Text
                  style={[
                    styles.itemSubtitle,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  {hasBiometrics
                    ? 'Require Fingerprint / Face ID to open Yípo'
                    : 'Require Passcode or PIN to open Yípo'}
                </Text>
              </View>
              <Switch
                value={lockEnabled}
                onValueChange={handleToggleLock}
                trackColor={{ false: colors.bg, true: colors.accent }}
              />
            </View>
          </View>
        </View>

        {/* Data & Backups Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            OFFLINE DATA & BACKUPS
          </Text>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
              },
            ]}>
            <Text
              style={[
                styles.itemTitle,
                { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
              ]}>
              Database Backup & Restore
            </Text>
            <Text
              style={[
                styles.itemSubtitle,
                { color: colors.muted, fontFamily: typography.bodyFont, marginTop: 2, marginBottom: spacing.base },
              ]}>
              Export your entire offline ledger to JSON for safekeeping on Google Drive, WhatsApp, or local storage.
            </Text>

            <View style={{ marginBottom: spacing.sm }}>
              <Button
                label="Export JSON Backup File"
                variant="primary"
                disabled={exportingBackup}
                onPress={handleExportBackup}
                style={{ width: '100%' }}
              />
            </View>

            <View style={{ marginBottom: spacing.sm }}>
              <Button
                label="Restore from JSON Backup"
                variant="secondary"
                disabled={restoringBackup}
                onPress={handleRestoreBackup}
                style={{ width: '100%' }}
              />
            </View>

            <View style={{ marginTop: spacing.xs }}>
              <Button
                label="Export Records to Excel (CSV)"
                variant="secondary"
                disabled={exportingCsv}
                onPress={handleExportCSV}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            ABOUT YÍPO
          </Text>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
              },
            ]}>
            <View style={styles.disclaimerRow}>
              <InfoIcon size={22} color={colors.accentText} strokeWidth={2} />
              <Text
                style={[
                  styles.disclaimerText,
                  {
                    color: colors.ink,
                    fontFamily: typography.bodyMediumFont,
                    marginLeft: spacing.sm,
                    flex: 1,
                  },
                ]}>
                {"Yípo is an offline record book only. It never holds, collects, or transfers anyone's money."}
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: colors.line, marginVertical: spacing.md },
              ]}
            />

            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.metaLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Version
              </Text>
              <Text
                style={[
                  styles.metaValue,
                  { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                ]}>
                1.0.0 (Offline Edition)
              </Text>
            </View>

            <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
              <Text
                style={[
                  styles.metaLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Timezone
              </Text>
              <Text
                style={[
                  styles.metaValue,
                  { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                ]}>
                Africa/Lagos (GMT+1)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  settingCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingLabel: {
    fontSize: 14,
  },
  pillContainer: {
    flexDirection: 'row',
  },
  pillButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
  },
});
