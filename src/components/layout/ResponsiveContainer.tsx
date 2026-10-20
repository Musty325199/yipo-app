import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  disableTopInset?: boolean;
  disableBottomInset?: boolean;
}

export function ResponsiveContainer({
  children,
  style,
  contentContainerStyle,
  disableTopInset = false,
  disableBottomInset = false,
}: ResponsiveContainerProps) {
  const insets = useSafeAreaInsets();
  const { colors, maxContentWidth } = useTheme();

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: colors.bg,
          paddingTop: disableTopInset ? 0 : insets.top,
          paddingBottom: disableBottomInset ? 0 : insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}>
      <View
        style={[
          styles.innerContainer,
          {
            maxWidth: maxContentWidth,
          },
          contentContainerStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});
