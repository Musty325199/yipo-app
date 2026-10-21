import React, { useState } from 'react';
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
const DOT_RADIUS = 12;

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

  // Cryptographically random shuffle using expo-crypto
  const performShuffle = () => {
    const list = [...members];
    const randomBuffer = new Uint32Array(list.length);
    Crypto.getRandomValues(randomBuffer);

    for (let i = list.length - 1; i > 0; i--) {
      const j = randomBuffer[i] % (i + 1);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    // Haptic tick generator during the spin
    const interval = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 120);

    // 8 full rotations + extra offset
    const totalRotation = Math.PI * 2 * 6 + Math.random() * Math.PI * 2;

    rotation.value = withTiming(
      totalRotation,
      {
        duration: 2600,
        easing: Easing.bezier(0.12, 1, 0.22, 1), // silk-smooth deceleration
      },
      (finished) => {
        if (finished) {
          runOnJS(clearInterval)(interval);
          runOnJS(performShuffle)();
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
                      inkColor={colors.ink}
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
                    },
                  ]}>
                  <Text
                    style={[
                      styles.orderBadgeText,
                      {
                        color: colors.ink,
                        fontFamily: typography.headingSemiBoldFont,
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
                  <Text
                    style={[
                      styles.collectorTag,
                      { color: colors.accent, fontFamily: typography.bodySemiBoldFont },
                    ]}>
                    Collects first
                  </Text>
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
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              label="Keep order"
              onPress={handleSaveAndConfirm}
              variant="secondary"
              disabled={isSpinning}
              style={{ flex: 1 }}
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
  inkColor: string;
}

function AnimatedDot({
  initialAngle,
  rotation,
  isCollector,
  accentColor,
  inkColor,
}: AnimatedDotProps) {
  const currentAngle = useDerivedValue(() => initialAngle + rotation.value);

  const cx = useDerivedValue(() => {
    const r = isCollector ? RING_RADIUS + 12 : RING_RADIUS;
    return CENTER + r * Math.cos(currentAngle.value);
  });

  const cy = useDerivedValue(() => {
    const r = isCollector ? RING_RADIUS + 12 : RING_RADIUS;
    return CENTER + r * Math.sin(currentAngle.value);
  });

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={isCollector ? DOT_RADIUS + 3 : DOT_RADIUS}
      color={isCollector ? accentColor : inkColor}
    />
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    width: 34,
    height: 34,
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
  collectorTag: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
  },
});
