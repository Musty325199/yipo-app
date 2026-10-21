import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, typography, radii, spacing } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  let backgroundColor = colors.accent;
  let textColor = colors.onAccent;
  let borderColor: string | undefined = undefined;

  if (variant === 'secondary') {
    backgroundColor = colors.surface;
    textColor = colors.ink;
    borderColor = colors.line;
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = colors.ink;
  } else if (variant === 'danger') {
    backgroundColor = colors.unpaid;
    textColor = '#FFFFFF';
  }

  // Rule: no text inside button must cut into second line except if more than 3 words for small devices
  const words = label ? label.trim().split(/\s+/).filter(Boolean) : [];
  const maxLines = words.length > 3 ? 2 : 1;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.buttonBase,
        {
          backgroundColor,
          borderRadius: radii.pill,
          borderColor,
          borderWidth: borderColor ? 1 : 0,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}>
      <View style={styles.contentRow}>
        {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
        <Text
          numberOfLines={maxLines}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[
            styles.buttonText,
            {
              color: textColor,
              fontFamily: typography.headingSemiBoldFont,
              textAlign: 'center',
            },
            textStyle,
          ]}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  buttonText: {
    fontSize: 16,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
});
