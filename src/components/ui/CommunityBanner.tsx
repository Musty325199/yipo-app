import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { getAppSetting, setAppSetting } from '@/utils/security';

const WHATSAPP_COMMUNITY_URL =
  'https://wa.me/2349065323916?text=' +
  encodeURIComponent('Hello Mustapha, I am using Yípo app and want to join the Organizers Community!');

export function CommunityBanner() {
  const { colors, typography, spacing, radii, isDark } = useTheme();

  const [hasCheckedSetting, setHasCheckedSetting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Use useState to initialize animated values safely without ref read during render
  const [progress] = useState(() => new Animated.Value(0));
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const joined = await getAppSetting('has_joined_community', 'false');
        if (isMounted) {
          if (joined !== 'true') {
            setIsVisible(true);
          }
          setHasCheckedSetting(true);
        }
      } catch {
        if (isMounted) setHasCheckedSetting(true);
      }
    })();

    return () => {
      isMounted = false;
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (animationRef.current) animationRef.current.stop();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });
  }, [fadeAnim]);

  useEffect(() => {
    if (!isVisible) return;

    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 8000,
      useNativeDriver: false,
    });
    animationRef.current = anim;

    anim.start(({ finished }) => {
      if (finished) {
        handleDismiss();
      }
    });

    return () => {
      anim.stop();
    };
  }, [isVisible, progress, handleDismiss]);

  const handleJoinPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (animationRef.current) animationRef.current.stop();
    try {
      await setAppSetting('has_joined_community', 'true');
      await Linking.openURL(WHATSAPP_COMMUNITY_URL);
    } catch {
      // Fallback
    }
    handleDismiss();
  };

  const handleAlreadyJoinedPress = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (animationRef.current) animationRef.current.stop();
    try {
      await setAppSetting('has_joined_community', 'true');
    } catch {
      // Fallback
    }
    handleDismiss();
  };

  if (!hasCheckedSetting || !isVisible) {
    return null;
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.bannerCard,
        {
          backgroundColor: isDark ? 'rgba(37, 211, 102, 0.12)' : '#F0FDF4',
          borderColor: isDark ? 'rgba(37, 211, 102, 0.3)' : '#BBF7D0',
          borderRadius: radii.card,
          marginBottom: spacing.base,
          opacity: fadeAnim,
        },
      ]}>
      {/* Top Row: Icon, Title, and Close Button */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: '#25D366',
                borderRadius: radii.pill,
              },
            ]}>
            <Text style={styles.badgeText}>COMMUNITY</Text>
          </View>
          <Text
            style={[
              styles.bannerTitle,
              { color: colors.ink, fontFamily: typography.headingFont },
            ]}>
            Join Yípo Organizers
          </Text>
        </View>

        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss banner"
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.closeIcon, { color: colors.muted }]}>✕</Text>
        </Pressable>
      </View>

      <Text
        style={[
          styles.bannerDescription,
          { color: colors.ink, fontFamily: typography.bodyFont },
        ]}>
        Connect directly with the developer & fellow Ajo organizers for updates, tips, and requests.
      </Text>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleJoinPress}
          style={({ pressed }) => [
            styles.joinButton,
            {
              backgroundColor: '#25D366',
              borderRadius: radii.pill,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Text
            style={[
              styles.joinButtonText,
              { fontFamily: typography.headingSemiBoldFont },
            ]}>
            Join on WhatsApp →
          </Text>
        </Pressable>

        <Pressable
          onPress={handleAlreadyJoinedPress}
          style={({ pressed }) => [
            styles.joinedButton,
            {
              borderColor: colors.line,
              borderRadius: radii.pill,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <Text
            style={[
              styles.joinedButtonText,
              { color: colors.muted, fontFamily: typography.bodySemiBoldFont },
            ]}>
            Joined ✓
          </Text>
        </Pressable>
      </View>

      {/* Animated Strip Line Timer Bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: '#25D366',
              width: progressWidth,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerCard: {
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  closeIcon: {
    fontSize: 15,
    fontWeight: '600',
  },
  bannerDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  joinButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  joinedButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedButtonText: {
    fontSize: 12,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressBar: {
    height: '100%',
  },
});
