import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
  useReducedMotion,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

const INK_BG = '#10241E';
const CREAM = '#F4EEE0';
const SAFFRON = '#F0B429';

const CANVAS_SIZE = 320;
const CENTER = CANVAS_SIZE / 2;
const BASE_RADIUS = 76;
const DOT_BASE_RADIUS = 10;
const SAFFRON_BASE_RADIUS = 15;
const OUTWARD_OFFSET = 26;
const COUNT = 8;
const SAFFRON_INDEX = 1;

interface SplashDotProps {
  index: number;
  scaleValue: SharedValue<number>;
  ringRotation: SharedValue<number>;
  ringScale: SharedValue<number>;
  saffronShift: SharedValue<number>;
}

function SplashDot({
  index,
  scaleValue,
  ringRotation,
  ringScale,
  saffronShift,
}: SplashDotProps) {
  const isSaffron = index === SAFFRON_INDEX;
  const initialAngle = (index * 2 * Math.PI) / COUNT - Math.PI / 2 + Math.PI / 8;

  const dotAngle = useDerivedValue(() => initialAngle + ringRotation.value);

  const dotRadius = useDerivedValue(() => {
    const base = isSaffron ? SAFFRON_BASE_RADIUS : DOT_BASE_RADIUS;
    return base * scaleValue.value * ringScale.value;
  });

  const dotX = useDerivedValue(() => {
    const r = (isSaffron ? BASE_RADIUS + saffronShift.value : BASE_RADIUS) * ringScale.value;
    return CENTER + r * Math.cos(dotAngle.value);
  });

  const dotY = useDerivedValue(() => {
    const r = (isSaffron ? BASE_RADIUS + saffronShift.value : BASE_RADIUS) * ringScale.value;
    return CENTER + r * Math.sin(dotAngle.value);
  });

  return (
    <Circle
      cx={dotX}
      cy={dotY}
      r={dotRadius}
      color={isSaffron ? SAFFRON : CREAM}
    />
  );
}

export function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const reducedMotion = useReducedMotion();

  // Master animation values
  const overlayOpacity = useSharedValue(1);
  const ringRotation = useSharedValue(0);
  const saffronShift = useSharedValue(0);
  const haloScale = useSharedValue(0);
  const haloOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.9);

  // Individual dot scales for the cascading ripple pop-in
  const dot0 = useSharedValue(0);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const dot4 = useSharedValue(0);
  const dot5 = useSharedValue(0);
  const dot6 = useSharedValue(0);
  const dot7 = useSharedValue(0);

  const dotScales = useMemo(
    () => [dot0, dot1, dot2, dot3, dot4, dot5, dot6, dot7],
    [dot0, dot1, dot2, dot3, dot4, dot5, dot6, dot7]
  );

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    if (reducedMotion) {
      dotScales.forEach((scale) => {
        scale.value = 1;
      });
      saffronShift.value = OUTWARD_OFFSET;
      ringScale.value = 1;
      overlayOpacity.value = withDelay(
        500,
        withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
      return;
    }

    // Phase 1: Staggered spark / pop-in around the circle (0 - 360ms)
    dotScales.forEach((scale, i) => {
      scale.value = withDelay(
        i * 42,
        withSequence(
          withTiming(1.22, { duration: 160, easing: Easing.out(Easing.back(1.5)) }),
          withSpring(1, { damping: 12, stiffness: 220 })
        )
      );
    });

    // Phase 2: Decelerating wheel spin + Saffron dot step-out (380ms - 820ms)
    ringScale.value = withDelay(
      380,
      withTiming(1.0, { duration: 420, easing: Easing.out(Easing.cubic) })
    );

    ringRotation.value = withDelay(
      360,
      withTiming(Math.PI / 2, {
        duration: 460,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
    );

    saffronShift.value = withDelay(
      420,
      withSequence(
        withSpring(OUTWARD_OFFSET + 4, { damping: 10, stiffness: 180 }),
        withSpring(OUTWARD_OFFSET, { damping: 14, stiffness: 250 })
      )
    );

    haloScale.value = withDelay(
      460,
      withTiming(1.9, { duration: 340, easing: Easing.out(Easing.quad) })
    );
    haloOpacity.value = withDelay(
      460,
      withSequence(
        withTiming(0.45, { duration: 120 }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) })
      )
    );

    // Phase 3: Seamless dissolve to Home screen (820ms - 1100ms)
    overlayOpacity.value = withDelay(
      820,
      withTiming(0, { duration: 280, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, [
    reducedMotion,
    onAnimationComplete,
    dotScales,
    overlayOpacity,
    ringRotation,
    ringScale,
    saffronShift,
    haloScale,
    haloOpacity,
  ]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const saffronAngle = useDerivedValue(() => {
    return (SAFFRON_INDEX * 2 * Math.PI) / COUNT - Math.PI / 2 + Math.PI / 8 + ringRotation.value;
  });

  const saffronX = useDerivedValue(() => {
    const r = (BASE_RADIUS + saffronShift.value) * ringScale.value;
    return CENTER + r * Math.cos(saffronAngle.value);
  });

  const saffronY = useDerivedValue(() => {
    const r = (BASE_RADIUS + saffronShift.value) * ringScale.value;
    return CENTER + r * Math.sin(saffronAngle.value);
  });

  const haloRadius = useDerivedValue(() => SAFFRON_BASE_RADIUS * haloScale.value);

  return (
    <Animated.View style={[styles.overlay, containerAnimatedStyle]}>
      <Canvas style={styles.canvas}>
        {/* Golden pulse ring around saffron dot */}
        <Circle
          cx={saffronX}
          cy={saffronY}
          r={haloRadius}
          color={SAFFRON}
          opacity={haloOpacity}
        />

        {/* 8 Dots Ring rendered with React component rules */}
        {dotScales.map((scaleValue, i) => (
          <SplashDot
            key={i}
            index={i}
            scaleValue={scaleValue}
            ringRotation={ringRotation}
            ringScale={ringScale}
            saffronShift={saffronShift}
          />
        ))}
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: INK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
});
