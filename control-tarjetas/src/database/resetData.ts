// Function to reset all data (for Settings reset option)

import { getDb, deleteDatabaseFile, initDatabase } from './dbCore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { auth } from '../firebase/firebaseConfig';


export async function resetAllData(): Promise<void> {
    // Legacy support, redirects to hard reset
    await hardResetApp('legacy');
}


/**
 * Hard Reset: Wipes ALL data from ALL tables locally and attempts to wipe cloud data for current user.
 * This is the "Nuclear Option" to ensure no residual data remains.
 */
export async function hardResetApp(userId: string): Promise<void> {
    console.log('[HARD RESET] Starting aggressive data wipe for user:', userId);

    try {
        // 1. Wipe Cloud Data First (Best effort)
        console.log('[HARD RESET] Wiping Cloud Data...');
        try {
            const { deleteAllFirestoreData } = await import('../firebase/sync');
            if (userId !== 'legacy') {
                await deleteAllFirestoreData(userId);
            }
            console.log('[HARD RESET] Cloud wipe complete.');
        } catch (e) {
            console.error('[HARD RESET] Cloud wipe failed (continuing to local wipe):', e);
        }

        // 2. Wipe Local Data (Logical Deletion Only - Safe & Clean)
        console.log('[HARD RESET] Clearing local DB tables...');
        try {
            // Init safely to ensure connection is open
            try {
                await initDatabase();
            } catch (ignore) { /* already open */ }

            const db = getDb();

            // Execute in order to respect FK constraints if possible, though SQLite usually handles DELETE without cascade unless configured.
            // Disable foreign keys temporarily if needed, but simple delete usually works.
            await db.runAsync('DELETE FROM installments');
            await db.runAsync('DELETE FROM purchases');
            await db.runAsync('DELETE FROM period_status');
            await db.runAsync('DELETE FROM cards');
            await db.runAsync('DELETE FROM people');
            await db.runAsync('DELETE FROM user_profile');

            console.log('[HARD RESET] Local tables cleared successfully.');
        } catch (e) {
            console.error('[HARD RESET] Failed to clear local tables:', e);
            throw e; // Critical failure
        }

        // 3. Clear AsyncStorage flags
        await AsyncStorage.removeItem('has_restored_data');
        await AsyncStorage.removeItem('user_session');
        console.log('[HARD RESET] Storage flags cleared.');

        // 4. Sign Out from Firebase
        try {
            console.log('[HARD RESET] Signing out...');
            await auth.signOut();
            console.log('[HARD RESET] Signed out.');
        } catch (e) {
            console.error('[HARD RESET] Error signing out (ignoring):', e);
        }

        console.log('[HARD RESET] Completed successfully. Reloading app...');
        try {
            await Updates.reloadAsync();
        } catch (e) {
            console.error('Error reloading app:', e);
            // Fallback if reload fails (e.g. in Expo Go dev client)
            Alert.alert(
                "Reinicio Necesario",
                "Se han borrado los datos correctamente. Por favor cierra y abre la aplicación para aplicar los cambios y evitar errores.",
                [{ text: "OK" }]
            );
        }

    } catch (error) {
        console.error('[HARD RESET] Critical error during wipe:', error);
        throw error;
    }
}

export const deleteAllUserData = hardResetApp;
