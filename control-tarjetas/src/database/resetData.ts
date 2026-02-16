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

    // Delete in correct order due to foreign keys
    await db.execAsync(`DELETE FROM transactions WHERE card_id IN (SELECT id FROM cards WHERE user_id = '${userId}')`);
    await db.execAsync(`DELETE FROM installments WHERE card_id IN (SELECT id FROM cards WHERE user_id = '${userId}')`);
    await db.execAsync(`DELETE FROM cards WHERE user_id = '${userId}'`);
    await db.execAsync(`DELETE FROM user_profile WHERE firebase_uid = '${userId}'`);
}
