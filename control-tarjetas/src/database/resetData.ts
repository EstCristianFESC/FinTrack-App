// Function to reset all data (for Settings reset option)

import { getDb } from './dbCore';


export async function resetAllData(): Promise<void> {
    const db = await getDb();

    await db.execAsync(`DELETE FROM transactions`);
    await db.execAsync(`DELETE FROM installments`);
    await db.execAsync(`DELETE FROM cards`);
    await db.execAsync(`DELETE FROM user_profile`);
}

export async function deleteAllUserData(userId: string): Promise<void> {
    const db = await getDb();
    console.log('[RESET] Starting deletion for user:', userId);

    try {
        await db.withTransactionAsync(async () => {
            // 1. Get Card IDs for this user to filter other tables
            const cards = await db.getAllAsync<{ id: number }>('SELECT id FROM cards WHERE user_id = ?', [userId]);
            const cardIds = cards.map(c => c.id);

            if (cardIds.length > 0) {
                const placeholders = cardIds.map(() => '?').join(',');

                // 2. Get Purchase IDs
                const purchases = await db.getAllAsync<{ id: number }>(`SELECT id FROM purchases WHERE card_id IN (${placeholders})`, cardIds);
                const purchaseIds = purchases.map(p => p.id);

                if (purchaseIds.length > 0) {
                    const purchPlaceholders = purchaseIds.map(() => '?').join(',');
                    // 3. Delete Installments
                    console.log('[RESET] Deleting installments...');
                    await db.runAsync(`DELETE FROM installments WHERE purchase_id IN (${purchPlaceholders})`, purchaseIds);
                }

                // 4. Delete Purchases
                console.log('[RESET] Deleting purchases...');
                await db.runAsync(`DELETE FROM purchases WHERE card_id IN (${placeholders})`, cardIds);

                // 5. Delete Period Status
                console.log('[RESET] Deleting period_status...');
                await db.runAsync(`DELETE FROM period_status WHERE card_id IN (${placeholders})`, cardIds);
            }

            // 6. Delete Cards
            console.log('[RESET] Deleting cards...');
            await db.runAsync('DELETE FROM cards WHERE user_id = ?', [userId]);

            // Note: We deliberately do NOT delete user_profile or people table generally, 
            // but if desired, we can. The prompt said "Perfil conservado".
            // People table is shared? Or should we delete people linked to this user's purchases?
            // People doesn't have user_id column in schema (dbCore line 49). 
            // So we leave people for now.
        });

        // 7. Delete from Cloud (Firestore)
        console.log('[RESET] Deleting from Cloud...');
        try {
            const { deleteAllFirestoreData } = await import('../firebase/sync');
            await deleteAllFirestoreData(userId);
            console.log('[RESET] Cloud wipe complete.');
        } catch (e) {
            console.error('[RESET] Cloud wipe failed:', e);
            // We swallow this error? No, if cloud wipe fails, we should tell user.
            throw new Error('Cloud wipe failed: ' + e);
        }

        // 8. Reset "Restored" flag so next launch checks fresh
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('has_restored_data');
        console.log('[RESET] Restore flag cleared.');

        console.log('[RESET] Data reset successfully (Local + Cloud).');
    } catch (error) {
        console.error('[RESET] Error deleting data:', error);
        throw error;
    }
}
