import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { LockIcon, InfoIcon } from '@/components/ui/icons';

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
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
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
        </View>

        {/* Appearance Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            Appearance
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
                    onPress={() => setThemePreference(opt.key)}
                    style={[
                      styles.pillButton,
                      {
                        backgroundColor: isActive ? colors.surface : 'transparent',
                        borderRadius: radii.pill,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isActive ? 0.08 : 0,
                        shadowRadius: 2,
                        elevation: isActive ? 1 : 0,
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

        {/* Security Section (Placeholder for Stage 6) */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            Security
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
                <LockIcon size={20} color={colors.ink} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  App lock
                </Text>
                <Text
                  style={[
                    styles.itemSubtitle,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  Require biometric or PIN to open Yípo
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            About Yípo
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
              <InfoIcon size={22} color={colors.accent} strokeWidth={2} />
                <Text
                  style={[
                    styles.disclaimerText,
                    {
                      color: colors.ink,
                      fontFamily: typography.bodyMediumFont,
                      marginLeft: spacing.sm,
                    },
                  ]}>
                  {"Yípo keeps records only. It does not hold or move anyone's money."}
                </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: colors.line, marginVertical: spacing.md },
              ]}
            />

            <View style={styles.versionRow}>
              <Text
                style={[
                  styles.versionLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Version
              </Text>
              <Text
                style={[
                  styles.versionValue,
                  { color: colors.ink, fontFamily: typography.bodyMediumFont },
                ]}>
                1.0.0 (Build 1)
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
    fontSize: 28,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingCard: {},
  settingLabel: {
    fontSize: 15,
  },
  pillContainer: {
    flexDirection: 'row',
  },
  pillButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
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
    fontSize: 16,
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 14,
  },
  versionValue: {
    fontSize: 14,
  },
});
