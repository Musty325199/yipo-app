import React from 'react';
import { View } from 'react-native';
import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useTheme } from '@/context/ThemeContext';

interface MiniRingProps {
  size?: number;
  highlightIndex?: number;
  paidIndices?: number[];
}

export function MiniRing({
  size = 64,
  highlightIndex = 1,
  paidIndices = [],
}: MiniRingProps) {
  const { colors } = useTheme();

  const center = size / 2;
  const count = 8;
  const baseRadius = size * 0.34;
  const dotRadius = size * 0.07;
  const saffronRadius = size * 0.095;
  const outwardShift = size * 0.12;

  const dots = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2 + Math.PI / 8;
    const isHighlight = i === highlightIndex;
    const isPaid = paidIndices.includes(i);

    const r = isHighlight ? baseRadius + outwardShift : baseRadius;
    const cx = center + r * Math.cos(angle);
    const cy = center + r * Math.sin(angle);
    const radius = isHighlight ? saffronRadius : dotRadius;

    let dotColor = colors.ink;
    if (isHighlight) {
      dotColor = colors.accent;
    } else if (isPaid) {
      dotColor = colors.paid;
    }

    dots.push({ key: i, cx, cy, radius, color: dotColor });
  }

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {dots.map((dot) => (
            <React.Fragment key={dot.key}>
              <Circle
                cx={dot.cx}
                cy={dot.cy}
                r={dot.radius + 1.5}
                color={colors.surface}
              />
              <Circle
                cx={dot.cx}
                cy={dot.cy}
                r={dot.radius}
                color={dot.color}
              />
              {dot.key === highlightIndex && (
                <Circle
                  cx={dot.cx}
                  cy={dot.cy}
                  r={3}
                  color={colors.onAccent}
                />
              )}
            </React.Fragment>
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
