import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Canvas,
  Circle,
  Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { MemberRecord, PaymentRecord } from '@/db/schema';
import { RollUpNumber } from '@/components/ui/RollUpNumber';

interface RoundRingProps {
  members: MemberRecord[];
  payments: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number })[];
  collectorMemberId: string;
  selectedMemberId: string | null;
  onSelectMember: (member: MemberRecord) => void;
  targetPot: number;
  collectedPot: number;
  roundNumber: number;
  totalRounds: number;
  size?: number;
}

export function RoundRing({
  members,
  payments,
  collectorMemberId,
  selectedMemberId,
  onSelectMember,
  targetPot,
  collectedPot,
  roundNumber,
  totalRounds,
  size = 290,
}: RoundRingProps) {
  const { colors, typography, isDark, formatNaira } = useTheme();

  const center = size / 2;
  const ringRadius = size * 0.38;
  const count = members.length;

  // Find collector index
  const collectorIndex = members.findIndex((m) => m.id === collectorMemberId);
  const activeCollectorIndex = collectorIndex >= 0 ? collectorIndex : 0;
  const collector = members[activeCollectorIndex];

  // Animated rotation: target angle rotates current collector to top (-PI / 2)
  const targetRotation = count > 0 ? -(activeCollectorIndex * 2 * Math.PI) / count : 0;
  const rotation = useSharedValue(targetRotation);

  // Animated breathing pulse for collector aura
  const pulse = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(targetRotation, {
      damping: 18,
      stiffness: 90,
      mass: 0.8,
    });
  }, [targetRotation, rotation]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1300 }),
        withTiming(0, { duration: 1300 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const percentCollected = targetPot > 0 ? Math.min(100, Math.round((collectedPot / targetPot) * 100)) : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Skia Canvas */}
      <Canvas style={{ width: size, height: size }}>
        {/* Track circle */}
        <Circle
          cx={center}
          cy={center}
          r={ringRadius}
          style="stroke"
          strokeWidth={1.5}
          color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,36,30,0.08)'}
        />

        {/* Member Dots */}
        <Group>
          {members.map((m, index) => {
            const p = payments.find((pay) => pay.member_id === m.id);
            const isCollector = m.id === collectorMemberId;
            const isPaid = p?.status === 'paid';
            const isPartPaid = p?.status === 'part_paid';
            const isSelected = m.id === selectedMemberId;

            // Initial angle placing 0 at 12 o'clock (-PI / 2)
            const initialAngle = (index * 2 * Math.PI) / count - Math.PI / 2;

            return (
              <RoundDot
                key={m.id}
                initialAngle={initialAngle}
                rotation={rotation}
                center={center}
                radius={ringRadius}
                isCollector={isCollector}
                isPaid={isPaid}
                isPartPaid={isPartPaid}
                isSelected={isSelected}
                pulse={pulse}
                accentColor={colors.accent}
                paidColor={colors.paid}
                unpaidColor={isDark ? '#4A5568' : '#CBD5E1'}
                partPaidColor="#E07A5F"
                surfaceColor={colors.surface}
              />
            );
          })}
        </Group>
      </Canvas>

      {/* Center Spotlight Card */}
      <View
        pointerEvents="box-none"
        style={[
          styles.centerOverlay,
          {
            width: size * 0.58,
            height: size * 0.58,
            borderRadius: (size * 0.58) / 2,
            backgroundColor: isDark ? 'rgba(16,36,30,0.45)' : 'rgba(255,255,255,0.7)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,36,30,0.06)',
          },
        ]}>
        <View style={styles.centerBadge}>
          <Text
            style={[
              styles.centerRoundText,
              { color: colors.muted, fontFamily: typography.bodyMediumFont },
            ]}>
            ROUND {roundNumber} OF {totalRounds}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.collectorNameText,
            { color: colors.ink, fontFamily: typography.headingFont },
          ]}>
          {collector?.name || 'Collector'}
        </Text>

        <View style={styles.potRow}>
          <Text
            style={[
              styles.potLabel,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            Payout:{' '}
          </Text>
          <RollUpNumber
            value={collectedPot}
            style={[
              styles.potAmount,
              { color: colors.accent, fontFamily: typography.headingSemiBoldFont },
            ]}
          />
        </View>

        <Text
          style={[
            styles.potTarget,
            { color: colors.muted, fontFamily: typography.bodyFont },
          ]}>
          of {formatNaira(targetPot)} ({percentCollected}%)
        </Text>
      </View>

      {/* Touch Overlay Hit Targets for each dot */}
      {members.map((m, index) => {
        // Calculate interactive hit coordinate for current position
        const currentAngle = (index * 2 * Math.PI) / count - Math.PI / 2 + targetRotation;
        const x = center + ringRadius * Math.cos(currentAngle);
        const y = center + ringRadius * Math.sin(currentAngle);
        const hitSize = 44;

        return (
          <Pressable
            key={m.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectMember(m);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${m.name}, turn ${m.turn_order}`}
            style={[
              styles.hitTarget,
              {
                left: x - hitSize / 2,
                top: y - hitSize / 2,
                width: hitSize,
                height: hitSize,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

interface RoundDotProps {
  initialAngle: number;
  rotation: SharedValue<number>;
  center: number;
  radius: number;
  isCollector: boolean;
  isPaid: boolean;
  isPartPaid: boolean;
  isSelected: boolean;
  pulse: SharedValue<number>;
  accentColor: string;
  paidColor: string;
  unpaidColor: string;
  partPaidColor: string;
  surfaceColor: string;
}

function RoundDot({
  initialAngle,
  rotation,
  center,
  radius,
  isCollector,
  isPaid,
  isPartPaid,
  isSelected,
  pulse,
  accentColor,
  paidColor,
  unpaidColor,
  partPaidColor,
  surfaceColor,
}: RoundDotProps) {
  const currentAngle = useDerivedValue(() => initialAngle + rotation.value);

  const cx = useDerivedValue(() => {
    return center + radius * Math.cos(currentAngle.value);
  });

  const cy = useDerivedValue(() => {
    return center + radius * Math.sin(currentAngle.value);
  });

  // Animated breathing aura radius for collector
  const haloRadius = useDerivedValue(() => {
    return 15 + pulse.value * 6;
  });

  // Halo opacity
  const haloColor = useDerivedValue(() => {
    const alpha = (0.45 - pulse.value * 0.35).toFixed(2);
    return `rgba(240, 180, 41, ${alpha})`;
  });

  // Determine dot color
  let dotColor = unpaidColor;
  let dotRadius = 9;

  if (isCollector) {
    dotColor = accentColor;
    dotRadius = 14;
  } else if (isPaid) {
    dotColor = paidColor;
    dotRadius = 11;
  } else if (isPartPaid) {
    dotColor = partPaidColor;
    dotRadius = 10;
  }

  return (
    <Group>
      {/* Collector pulsating halo */}
      {isCollector && (
        <Circle cx={cx} cy={cy} r={haloRadius} color={haloColor} />
      )}

      {/* Selected highlight ring */}
      {isSelected && (
        <Circle
          cx={cx}
          cy={cy}
          r={dotRadius + 5}
          style="stroke"
          strokeWidth={2}
          color={accentColor}
        />
      )}

      {/* Main node dot */}
      <Circle cx={cx} cy={cy} r={dotRadius} color={dotColor} />

      {/* Paid inner check dot */}
      {isPaid && !isCollector && (
        <Circle cx={cx} cy={cy} r={4} color={surfaceColor} />
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  centerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  centerRoundText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  collectorNameText: {
    fontSize: 17,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  potRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  potLabel: {
    fontSize: 12,
  },
  potAmount: {
    fontSize: 15,
  },
  potTarget: {
    fontSize: 11,
    marginTop: 2,
  },
  hitTarget: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
