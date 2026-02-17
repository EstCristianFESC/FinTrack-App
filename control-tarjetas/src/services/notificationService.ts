import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Helper to get day difference
const getDaysDifference = (targetDate: Date) => {
    const today = new Date();
    // Reset hours to compare only days
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Key to store user preference
const PERMISSION_IGNORED_KEY = 'notification_permission_ignored';

export async function checkPermissionsSmart() {
    try {
        // 1. Check if user already said "Don't ask again"
        const ignored = await AsyncStorage.getItem(PERMISSION_IGNORED_KEY);
        if (ignored === 'true') {
            console.log('User ignored notification permissions previously.');
            return;
        }

        // 2. Check current status
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        // 3. If not granted, ask politely
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // 4. If still not granted, ask if they want to ignore future requests
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');

            // Optional: Ask user if they want to stop being asked
            Alert.alert(
                "Notificaciones Desactivadas",
                "Sin permisos no podremos avisarte de tus pagos. ¿Quieres activar las notificaciones o ignorar este aviso?",
                [
                    {
                        text: "Ignorar por ahora",
                        onPress: async () => {
                            await AsyncStorage.setItem(PERMISSION_IGNORED_KEY, 'true');
                        },
                        style: "cancel"
                    },
                    {
                        text: "Ir a Configuración",
                        onPress: () => {
                            // Linking.openSettings() could go here
                        }
                    }
                ]
            );
            return;
        }

        // 5. If granted, ensure Android channel exists
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

    } catch (error) {
        console.warn('Smart permission check failed:', error);
    }
}

// Kept for backward compatibility if needed, but checkPermissionsSmart is preferred
export async function registerForPushNotificationsAsync() {
    await checkPermissionsSmart();
}

export async function schedulePaymentReminders(cardName: string, payDate: Date, cardId: number) {
    try {
        // 1. Cancel existing reminders for this card to avoid duplicates
        await cancelRemindersForCard(cardId);

        const daysUntilDue = getDaysDifference(payDate);

        if (daysUntilDue < 0) return; // Already passed

        // Strategy: Schedule 5 notifications (Days 5, 3, 1, 0)
        // We limit to avoiding spam if the user opens the app late
        const triggers = [5, 3, 1, 0];

        for (const daysBefore of triggers) {
            // Calculate trigger date
            const triggerDate = new Date(payDate);
            triggerDate.setDate(triggerDate.getDate() - daysBefore);
            triggerDate.setHours(9, 0, 0, 0); // 9:00 AM

            // If trigger date is in the past, skip
            if (triggerDate.getTime() < Date.now()) continue;

            let title = '';
            let body = '';

            if (daysBefore === 5) {
                title = `🗓️ ${cardName}: Faltan 5 días`;
                body = 'El corte se acerca. Revisa tus gastos para no llevarte sorpresas.';
            } else if (daysBefore === 3) {
                title = `⏳ ${cardName}: Faltan 3 días`;
                body = 'Recuerda tener listo el pago para evitar intereses.';
            } else if (daysBefore === 1) {
                title = `⏰ ${cardName}: ¡Es Mañana!`;
                body = 'Último aviso. Paga mañana para estar al día.';
            } else if (daysBefore === 0) {
                title = `🚨 ${cardName}: ¡PAGA HOY!`;
                body = 'Hoy es la fecha límite. Realiza el pago ya mismo.';
            }

            // Calculation for seconds until trigger
            // (Only for future dates, we already checked this with getTime())
            const secondsUntilTrigger = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));

            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { cardId, type: 'payment_reminder' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntilTrigger,
                    repeats: false
                },
                identifier: `payment-${cardId}-${daysBefore}`
            });

            console.log(`Scheduled reminder for ${cardName} in ${daysBefore} days`);
        }
    } catch (error) {
        console.warn('Failed to schedule reminder:', error);
    }
}

export async function cancelRemindersForCard(cardId: number) {
    const triggers = [5, 3, 1, 0];
    for (const d of triggers) {
        try {
            await Notifications.cancelScheduledNotificationAsync(`payment-${cardId}-${d}`);
        } catch (e) {
            // Ignore error if not found
        }
    }
}

export async function cancelAllReminders() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}
