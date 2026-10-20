import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

const INK_BG = '#10241E';
const CREAM = '#F4EEE0';
const SAFFRON = '#F0B429';

const CANVAS_SIZE = 300;
const CENTER = CANVAS_SIZE / 2;
const BASE_RADIUS = 76;
const DOT_RADIUS = 11;
const SAFFRON_RADIUS = 16;
const OUTWARD_OFFSET = 26;
const COUNT = 8;
const SAFFRON_INDEX = 1;

export function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const reducedMotion = useReducedMotion();

  // Animation values
  const overlayOpacity = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const saffronShift = useSharedValue(0);

  useEffect(() => {
    // Hide native splash once Skia splash component is mounted
    SplashScreen.hideAsync().catch(() => {});

    if (reducedMotion) {
      // Reduced motion: show final positions with gentle fade
      ringOpacity.value = 1;
      saffronShift.value = OUTWARD_OFFSET;
      overlayOpacity.value = withDelay(
        600,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
      return;
    }

    // Normal motion: Under 1.2 seconds total
    // 1. Ring dots fade in (0 - 320ms)
    ringOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });

    // 2. Saffron dot steps outward (320ms - 750ms)
    saffronShift.value = withDelay(
      320,
      withTiming(OUTWARD_OFFSET, {
        duration: 430,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      })
    );

    // 3. Fade out overlay cleanly to reveal home screen (850ms - 1150ms)
    overlayOpacity.value = withDelay(
      850,
      withTiming(0, { duration: 300, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, [reducedMotion, onAnimationComplete, overlayOpacity, ringOpacity, saffronShift]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const dots = [];
  for (let i = 0; i < COUNT; i++) {
    const angle = (i * 2 * Math.PI) / COUNT - Math.PI / 2 + Math.PI / 8;
    const isSaffron = i === SAFFRON_INDEX;
    dots.push({
      key: i,
      angle,
      isSaffron,
      color: isSaffron ? SAFFRON : CREAM,
      radius: isSaffron ? SAFFRON_RADIUS : DOT_RADIUS,
    });
  }

  return (
    <Animated.View style={[styles.overlay, containerAnimatedStyle]}>
      <Canvas style={styles.canvas}>
        <Group opacity={ringOpacity}>
          {dots.map((dot) => {
            const currentR = dot.isSaffron
              ? BASE_RADIUS + saffronShift.value
              : BASE_RADIUS;
            const cx = CENTER + currentR * Math.cos(dot.angle);
            const cy = CENTER + currentR * Math.sin(dot.angle);
            return (
              <Circle
                key={dot.key}
                cx={cx}
                cy={cy}
                r={dot.radius}
                color={dot.color}
              />
            );
          })}
        </Group>
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
