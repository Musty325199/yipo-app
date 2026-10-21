import React, { useState, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';

export interface DraftMember {
  tempId: string;
  name: string;
  phone: string;
  formatted_phone: string;
  note?: string;
  turn_order: number;
}

interface DrawOrderModalProps {
  visible: boolean;
  members: DraftMember[];
  onClose: () => void;
  onApplyOrder: (orderedMembers: DraftMember[]) => void;
}

const CANVAS_SIZE = 260;
const CENTER = CANVAS_SIZE / 2;
const RING_RADIUS = 88;
const DOT_RADIUS = 13;

export function DrawOrderModal({
  visible,
  members,
  onClose,
  onApplyOrder,
}: DrawOrderModalProps) {
  const { colors, typography, spacing, radii, isDark } = useTheme();

  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [drawnList, setDrawnList] = useState<DraftMember[]>([]);

  const rotation = useSharedValue(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cryptographically secure shuffle with fallback
  const performShuffle = () => {
    try {
      const list = [...members];
      for (let i = list.length - 1; i > 0; i--) {
        const randomBytes = Crypto.getRandomBytes(4);
        const randomVal =
          (randomBytes[0] |
            (randomBytes[1] << 8) |
            (randomBytes[2] << 16) |
            (randomBytes[3] << 24)) >>>
          0;
        const j = randomVal % (i + 1);
        const temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }

      const reordered = list.map((m, idx) => ({
        ...m,
        turn_order: idx + 1,
      }));

      setDrawnList(reordered);
      setIsSpinning(false);
      setHasDrawn(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      // Fallback
      const list = [...members];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
      const reordered = list.map((m, idx) => ({
        ...m,
        turn_order: idx + 1,
      }));
      setDrawnList(reordered);
      setIsSpinning(false);
      setHasDrawn(true);
    }
  };

  const handleSpinFinished = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    performShuffle();
  };

  const handleStartDraw = () => {
    if (hasDrawn) {
      Alert.alert(
        'Redraw order?',
        'This group order has already been drawn. Are you sure you want to draw again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Redraw', style: 'destructive', onPress: executeSpin },
        ]
      );
    } else {
      executeSpin();
    }
  };

  const executeSpin = () => {
    setIsSpinning(true);
    rotation.value = 0;

    // Clear previous timeouts
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    // Schedule tactile decelerating clicks
    const tickDelays = [80, 180, 320, 520, 800, 1200, 1750];
    tickDelays.forEach((delay) => {
      const t = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, delay);
      timeoutsRef.current.push(t);
    });

    // 6 full rotations + random extra offset
    const totalRotation = Math.PI * 2 * 6 + Math.random() * Math.PI * 2;

    rotation.value = withTiming(
      totalRotation,
      {
        duration: 2500,
        easing: Easing.bezier(0.12, 1, 0.22, 1), // Silk-smooth deceleration
      },
      (finished) => {
        if (finished) {
          runOnJS(handleSpinFinished)();
        }
      }
    );
  };

  const handleSaveAndConfirm = () => {
    if (drawnList.length > 0) {
      onApplyOrder(drawnList);
    }
    onClose();
  };

  const displayList = drawnList.length > 0 ? drawnList : members;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.lg,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
            },
          ]}>
          <Text
            style={[
              styles.modalTitle,
              { color: colors.ink, fontFamily: typography.headingFont },
            ]}>
            Draw Turn Order
          </Text>
          <Text
            style={[
              styles.modalSubtitle,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            The ring will spin and assign payout positions at random.
          </Text>

          {/* Skia Spinning Ring */}
          <View style={styles.ringContainer}>
            <Canvas style={styles.canvas}>
              {/* Outer guide track */}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={RING_RADIUS}
                style="stroke"
                strokeWidth={2}
                color={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,36,29,0.08)'}
              />

              <Group>
                {displayList.map((m, i) => {
                  const initialAngle = (i * 2 * Math.PI) / displayList.length - Math.PI / 2;
                  const isCurrent = i === 0;

                  return (
                    <AnimatedDot
                      key={m.tempId}
                      index={i}
                      initialAngle={initialAngle}
                      rotation={rotation}
                      isCollector={isCurrent}
                      accentColor={colors.accent}
                      onAccentColor={colors.onAccent}
                      inkColor={colors.ink}
                      surfaceColor={colors.surface}
                    />
                  );
                })}
              </Group>
            </Canvas>
          </View>

          {/* Ordered Result Preview */}
          <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
            {displayList.map((m, idx) => (
              <View
                key={m.tempId}
                style={[
                  styles.resultRow,
                  {
                    borderColor: colors.line,
                    borderBottomWidth: idx === displayList.length - 1 ? 0 : 1,
                    paddingVertical: spacing.sm,
                  },
                ]}>
                <View
                  style={[
                    styles.orderBadge,
                    {
                      backgroundColor: idx === 0 ? colors.accent : colors.bg,
                      borderRadius: radii.pill,
                      borderColor: colors.line,
                      borderWidth: 1,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.orderBadgeText,
                      {
                        color: idx === 0 ? colors.onAccent : colors.ink,
                        fontFamily: typography.headingSemiBoldFont,
                        fontWeight: '700',
                      },
                    ]}>
                    #{idx + 1}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={[
                      styles.resultMemberName,
                      { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                    ]}>
                    {m.name}
                  </Text>
                  <Text
                    style={[
                      styles.resultMemberPhone,
                      { color: colors.muted, fontFamily: typography.bodyFont },
                    ]}>
                    {m.formatted_phone}
                  </Text>
                </View>

                {idx === 0 && (
                  <View
                    style={[
                      styles.collectorPill,
                      {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                        borderRadius: radii.pill,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.collectorTag,
                        { color: colors.accentText, fontFamily: typography.bodySemiBoldFont },
                      ]}>
                      Collects first
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.buttonRow, { marginTop: spacing.md }]}>
            <Button
              label={isSpinning ? 'Drawing...' : hasDrawn ? 'Redraw' : 'Draw order'}
              onPress={handleStartDraw}
              disabled={isSpinning}
              style={{ flex: 1, marginRight: spacing.sm, paddingHorizontal: spacing.sm, minHeight: 46 }}
              textStyle={{ fontSize: 14 }}
            />
            <Button
              label="Keep order"
              onPress={handleSaveAndConfirm}
              variant="secondary"
              disabled={isSpinning}
              style={{ flex: 1, paddingHorizontal: spacing.sm, minHeight: 46 }}
              textStyle={{ fontSize: 14 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface AnimatedDotProps {
  index: number;
  initialAngle: number;
  rotation: SharedValue<number>;
  isCollector: boolean;
  accentColor: string;
  onAccentColor: string;
  inkColor: string;
  surfaceColor: string;
}

function AnimatedDot({
  initialAngle,
  rotation,
  isCollector,
  accentColor,
  onAccentColor,
  inkColor,
  surfaceColor,
}: AnimatedDotProps) {
  const currentAngle = useDerivedValue(() => initialAngle + rotation.value);

  const cx = useDerivedValue(() => {
    const r = isCollector ? RING_RADIUS + 10 : RING_RADIUS;
    return CENTER + r * Math.cos(currentAngle.value);
  });

  const cy = useDerivedValue(() => {
    const r = isCollector ? RING_RADIUS + 10 : RING_RADIUS;
    return CENTER + r * Math.sin(currentAngle.value);
  });

  return (
    <Group>
      {/* Outer border ring */}
      <Circle
        cx={cx}
        cy={cy}
        r={isCollector ? DOT_RADIUS + 4 : DOT_RADIUS + 1}
        color={surfaceColor}
      />
      {/* Main fill dot */}
      <Circle
        cx={cx}
        cy={cy}
        r={isCollector ? DOT_RADIUS + 2 : DOT_RADIUS}
        color={isCollector ? accentColor : inkColor}
      />
      {/* Inner collector spotlight center */}
      {isCollector && (
        <Circle cx={cx} cy={cy} r={5} color={onAccentColor} />
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  resultsScroll: {
    maxHeight: 210,
    marginTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    fontSize: 13,
  },
  resultMemberName: {
    fontSize: 15,
  },
  resultMemberPhone: {
    fontSize: 12,
  },
  collectorPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  collectorTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
  },
});
