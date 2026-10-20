import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { MiniRing } from '@/components/ring/MiniRing';
import { Button } from '@/components/ui/button';

export default function GroupsHomeScreen() {
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={[styles.headerRow, { marginVertical: spacing.lg }]}>
          <View>
            <Text
              style={[
                styles.appTitle,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              Yípo
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              Savings groups
            </Text>
          </View>

          <Button
            label="+ New group"
            onPress={() => {
              // Create group modal will open here in Stage 2
            }}
            style={{ minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.base }}
          />
        </View>

        {/* Empty State Showcase */}
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.xl,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 12,
              elevation: isDark ? 0 : 2,
            },
          ]}>
          <View style={[styles.miniRingWrapper, { marginBottom: spacing.base }]}>
            <MiniRing size={88} highlightIndex={1} />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
            ]}>
            No groups yet
          </Text>
          <Text
            style={[
              styles.emptyBody,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            No group yet. Add your first ajo and the ring will appear here.
          </Text>
        </View>

        {/* Design System Preview Card: Showcase Tokens, Naira formatting, Radii */}
        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.md },
            ]}>
            Preview layout (Stage 1)
          </Text>

          <View
            style={[
              styles.groupCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0 : 0.06,
                shadowRadius: 10,
                elevation: isDark ? 0 : 2,
              },
            ]}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardInfo}>
                <Text
                  style={[
                    styles.groupName,
                    { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                  ]}>
                  Lekki Market Traders
                </Text>
                <Text
                  style={[
                    styles.groupMeta,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  {formatNaira(50000)} / week • Round 3 of 8
                </Text>
              </View>
              <MiniRing size={52} highlightIndex={2} paidIndices={[0, 1]} />
            </View>

            <View
              style={[
                styles.cardDivider,
                { backgroundColor: colors.line, marginVertical: spacing.md },
              ]}
            />

            <View style={styles.cardFooter}>
              <View>
                <Text
                  style={[
                    styles.statLabel,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  Next collector
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  Amina Bello
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  Outstanding
                </Text>
                <Text
                  style={[
                    styles.amountText,
                    { color: colors.unpaid, fontFamily: typography.headingSemiBoldFont },
                  ]}>
                  {formatNaira(150000)}
                </Text>
              </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    textAlign: 'center',
  },
  miniRingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCard: {
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  groupMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    width: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
  },
  amountText: {
    fontSize: 16,
  },
});
