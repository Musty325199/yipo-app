import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface ImageViewerModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  title?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageViewerModal({
  visible,
  imageUri,
  onClose,
  title = 'Receipt photo',
}: ImageViewerModalProps) {
  const { typography, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible || !imageUri) return null;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        {/* Top Header Bar */}
        <View
          style={[
            styles.headerBar,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingHorizontal: spacing.base,
              borderBottomColor: 'rgba(255, 255, 255, 0.12)',
            },
          ]}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: '#FFFFFF', fontFamily: typography.headingSemiBoldFont },
            ]}>
            {title}
          </Text>

          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close receipt view"
            style={[
              styles.closeBtn,
              { backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: radii.pill },
            ]}>
            <Text style={[styles.closeBtnText, { color: '#FFFFFF', fontFamily: typography.bodyMediumFont }]}>
              ✕ Close
            </Text>
          </Pressable>
        </View>

        {/* Centered Image View */}
        <Pressable style={styles.imageContainer} onPress={handleClose}>
          <Image
            source={{ uri: imageUri }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  title: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  closeBtnText: {
    fontSize: 13,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
