import React, { useState, useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, AppState } from 'react-native';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AnimatedSplash } from '@/components/splash/AnimatedSplash';
import { setupNotificationChannels } from '@/utils/notifications';
import { LockScreen } from '@/components/security/LockScreen';
import { isAppLockEnabled } from '@/utils/security';
import { useShareIntent } from 'expo-share-intent';
import { ShareReceiptModal } from '@/components/sheets/ShareReceiptModal';

// Keep splash visible until fonts are loaded and ready
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootContent() {
  const { colors, isDark } = useTheme();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  const sharedImageFiles = React.useMemo(() => {
    if (!hasShareIntent || !shareIntent?.files) return [];
    return shareIntent.files.filter(
      (f) => !f.mimeType || f.mimeType.startsWith('image/')
    );
  }, [hasShareIntent, shareIntent]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

      {sharedImageFiles.length > 0 && (
        <ShareReceiptModal
          visible={sharedImageFiles.length > 0}
          files={sharedImageFiles}
          onClose={() => resetShareIntent(true)}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCheckDone, setLockCheckDone] = useState(false);

  const lastUnlockedAtRef = useRef<number>(0);
  const backgroundAtRef = useRef<number>(0);
  const isLockedRef = useRef(false);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    setupNotificationChannels().catch(() => {});

    // Initial launch check (cold start)
    (async () => {
      const lockEnabled = await isAppLockEnabled();
      if (lockEnabled) {
        setIsLocked(true);
      }
      setLockCheckDone(true);
    })();

    // Standard mobile session management: lock only when returning from being away
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'background') {
        backgroundAtRef.current = Date.now();
      } else if (nextState === 'active') {
        // 1. If unlocked within the last 6 seconds, this 'active' event is the biometric prompt closing
        if (Date.now() - lastUnlockedAtRef.current < 6000) {
          return;
        }

        // 2. If already locked, do not re-lock
        if (isLockedRef.current) {
          return;
        }

        // 3. Only lock if the user actually switched away from the app for more than 45 seconds (standard security timeout)
        const awayMs = backgroundAtRef.current > 0 ? Date.now() - backgroundAtRef.current : 0;
        if (awayMs >= 45000) {
          const lockEnabled = await isAppLockEnabled();
          if (lockEnabled) {
            setIsLocked(true);
          }
        }
        backgroundAtRef.current = 0;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUnlocked = () => {
    lastUnlockedAtRef.current = Date.now();
    setIsLocked(false);
  };

  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Determine whether to reveal the app content
  const canShowContent = splashAnimationDone && lockCheckDone && !isLocked;

  return (
    <ThemeProvider>
      {canShowContent && <RootContent />}
      {isLocked && splashAnimationDone && (
        <LockScreen visible={isLocked} onUnlocked={handleUnlocked} />
      )}
      {!splashAnimationDone && (
        <AnimatedSplash
          onAnimationComplete={() => {
            setSplashAnimationDone(true);
          }}
        />
      )}
    </ThemeProvider>
  );
}
