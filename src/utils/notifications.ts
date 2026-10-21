import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize Android notification channels.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ajo-reminders', {
      name: 'Ajo Due Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F0B429',
    });
  }
}

/**
 * Request notification permissions from user if not granted yet.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule due date and follow-up notifications for an active Ajo round.
 */
export async function scheduleRoundNotification({
  groupId,
  groupName,
  roundNumber,
  dueDateISO,
  collectorName,
}: {
  groupId: string;
  groupName: string;
  roundNumber: number;
  dueDateISO: string;
  collectorName: string;
}): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    await setupNotificationChannels();

    const dueDate = new Date(dueDateISO);
    // Schedule for 9:00 AM on due date
    dueDate.setHours(9, 0, 0, 0);

    const now = new Date();
    // If due date is already in the past, do not schedule
    if (dueDate.getTime() <= now.getTime()) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${groupName} — Round ${roundNumber} Due Today!`,
        body: `Payout pot goes to ${collectorName}. Open Yípo to track contributions and send reminders.`,
        data: { groupId, roundNumber },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dueDate,
        channelId: 'ajo-reminders',
      },
    });

    return notificationId;
  } catch {
    return null;
  }
}

/**
 * Cancel notifications for a specific round once closed or updated.
 */
export async function cancelRoundNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignore cancel errors
  }
}
