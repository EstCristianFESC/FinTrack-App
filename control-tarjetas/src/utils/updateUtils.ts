import * as Updates from 'expo-updates';

export type UpdateCheckResult = {
    status: 'available' | 'uptodate' | 'error' | 'development';
    error?: any;
};

export async function checkForOTAUpdate(): Promise<UpdateCheckResult> {
    try {
        if (__DEV__) {
            return { status: 'development' };
        }

        console.log('🔄 Checking for OTA updates...');
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
            return { status: 'available' };
        } else {
            return { status: 'uptodate' };
        }
    } catch (error) {
        console.error('❌ Error checking for updates:', error);
        return { status: 'error', error };
    }
}

export async function fetchAndReloadUpdate() {
    try {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
    } catch (error) {
        console.error('Error fetching update:', error);
        throw error;
    }
}
