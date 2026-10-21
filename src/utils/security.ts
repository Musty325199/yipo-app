import * as LocalAuthentication from 'expo-local-authentication';
import { getDb } from '@/db/client';

/**
 * Check if the device hardware supports biometrics (Fingerprint / Face ID).
 */
export async function hasBiometricHardware(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Prompt biometric authentication dialog with customizable message.
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Unlock Yípo Record Book'
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get setting value from SQLite app_settings table.
 */
export async function getAppSetting(key: string, defaultValue = ''): Promise<string> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = ?;`,
      [key]
    );
    return row ? row.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Save setting value into SQLite app_settings table.
 */
export async function setAppSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value]
    );
  } catch {
    // Graceful fallback
  }
}

export async function isAppLockEnabled(): Promise<boolean> {
  const val = await getAppSetting('app_lock_enabled', 'false');
  return val === 'true';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await setAppSetting('app_lock_enabled', enabled ? 'true' : 'false');
}

export async function getLockPin(): Promise<string> {
  return await getAppSetting('app_lock_pin', '');
}

export async function setLockPin(pin: string): Promise<void> {
  await setAppSetting('app_lock_pin', pin);
}
