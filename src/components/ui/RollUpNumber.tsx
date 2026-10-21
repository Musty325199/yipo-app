import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';

interface RollUpNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle | TextStyle[];
  duration?: number;
}

/**
 * High-performance 60fps rolling counter with ease-out cubic deceleration.
 * Formats integer values with standard Nigerian thousand commas (e.g. ₦120,000).
 */
export function RollUpNumber({
  value,
  prefix = '₦',
  suffix = '',
  style,
  duration = 650,
}: RollUpNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const currentValRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = currentValRef.current;
    const endVal = value;
    startTimeRef.current = null;

    if (startVal === endVal) {
      return;
    }

    const diff = endVal - startVal;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Ease-out cubic: 1 - pow(1 - t, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * easeOut);

      currentValRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatted = displayValue.toLocaleString('en-NG');

  return (
    <Text style={[styles.text, style]}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
});
