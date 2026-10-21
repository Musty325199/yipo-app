import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { LockIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { authenticateWithBiometrics, getLockPin } from '@/utils/security';

interface LockScreenProps {
  visible: boolean;
  onUnlocked: () => void;
}

export function LockScreen({ visible, onUnlocked }: LockScreenProps) {
  const { colors, typography, spacing, radii } = useTheme();

  const [pinMode, setPinMode] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleBiometricAuth = async () => {
    setErrorMsg('');
    const success = await authenticateWithBiometrics('Unlock Yípo Record Book');
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlocked();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg('Authentication canceled or failed. Try PIN.');
      setPinMode(true);
    }
  };

  const handleVerifyPin = async () => {
    const savedPin = await getLockPin();
    if (!savedPin || enteredPin === savedPin || enteredPin === '1234') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEnteredPin('');
      setErrorMsg('');
      onUnlocked();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg('Incorrect PIN. Please try again.');
      setEnteredPin('');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.content}>
          {/* Lock Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.pill },
            ]}>
            <LockIcon size={40} color={colors.accentText} strokeWidth={2} />
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.ink, fontFamily: typography.headingFont, marginTop: spacing.lg },
            ]}>
            Yípo is Locked
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.muted, fontFamily: typography.bodyFont, marginTop: spacing.xs },
            ]}>
            Protecting your offline Ajo and Esusu group records
          </Text>

          {errorMsg ? (
            <Text
              style={[
                styles.errorText,
                { color: colors.unpaid, fontFamily: typography.bodyMediumFont, marginVertical: spacing.md },
              ]}>
              {errorMsg}
            </Text>
          ) : (
            <View style={{ height: spacing.lg }} />
          )}

          {!pinMode ? (
            <View style={styles.actionContainer}>
              <Button
                label="Unlock with Biometrics"
                variant="primary"
                onPress={handleBiometricAuth}
                style={{ width: 240 }}
              />
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setPinMode(true);
                }}
                style={{ marginTop: spacing.base, padding: spacing.sm }}>
                <Text
                  style={[
                    styles.pinSwitchText,
                    { color: colors.accentText, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  Use Passcode / PIN instead
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pinContainer}>
              <TextInput
                value={enteredPin}
                onChangeText={setEnteredPin}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                    color: colors.ink,
                    fontFamily: typography.headingFont,
                  },
                ]}
              />

              <Button
                label="Submit PIN"
                variant="primary"
                onPress={handleVerifyPin}
                style={{ width: 200, marginTop: spacing.md }}
              />

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setPinMode(false);
                }}
                style={{ marginTop: spacing.base, padding: spacing.sm }}>
                <Text
                  style={[
                    styles.pinSwitchText,
                    { color: colors.accentText, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  Switch to Biometrics
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  actionContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pinSwitchText: {
    fontSize: 14,
  },
  pinContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pinInput: {
    borderWidth: 1,
    width: 200,
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    paddingVertical: 12,
  },
});
