import { db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';

const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.canalasesores.fintrackmovil'; // Reemplazar con URL real si existe
const STORE_URL_IOS = 'https://apps.apple.com/app/id...'; // Reemplazar con URL real si existe

interface AppConfig {
    latestVersion: string;
    minVersion?: string;
    title?: string;
    message?: string;
    updateUrlAndroid?: string;
    updateUrlIOS?: string;
    forceUpdate?: boolean;
}

export const checkAppVersion = async () => {
    try {
        const configRef = doc(db, 'app_config', 'main');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            const config = configSnap.data() as AppConfig;
            const currentVersion = Constants.expoConfig?.version || '1.0.0';

            console.log(`Version Check: Current (${currentVersion}) vs Latest (${config.latestVersion})`);

            if (isUpdateNeeded(currentVersion, config.latestVersion)) {
                showUpdateAlert(config);
            }
        }
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.log('⚠️ Version check skipped (Permission Denied). Verify Firestore Rules.');
        } else {
            console.log('Error checking app version:', error);
        }
    }
};

const isUpdateNeeded = (current: string, latest: string): boolean => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const c = currentParts[i] || 0;
        const l = latestParts[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
};

const showUpdateAlert = (config: AppConfig) => {
    const title = config.title || 'Nueva versión disponible';
    const message = config.message || 'Hay una nueva versión de FinTrack disponible. Por favor actualiza para disfrutar de las últimas mejoras.';
    const updateUrl = Platform.OS === 'ios'
        ? (config.updateUrlIOS || STORE_URL_IOS)
        : (config.updateUrlAndroid || STORE_URL_ANDROID);

    const buttons = [
        {
            text: 'Actualizar',
            onPress: () => {
                Linking.openURL(updateUrl).catch(err => console.error('Error opening URL:', err));
                // Si es actualización forzada, podrías volver a mostrar la alerta aquí o impedir el uso
                if (config.forceUpdate) {
                    // Recursively show alert if forced? Or just exit?
                    // For now, let's just let them click it or we can re-show it.
                }
            }
        }
    ];

    if (!config.forceUpdate) {
        buttons.push({
            text: 'Más tarde',
            onPress: () => console.log('Update postponed')
        });
    }

    Alert.alert(title, message, buttons, { cancelable: !config.forceUpdate });
};
