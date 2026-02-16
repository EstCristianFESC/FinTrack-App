// User Profile CRUD Functions


import { getDb } from './dbCore';


export interface UserProfile {
    id?: number;
    firebase_uid: string;
    display_name?: string;
    email?: string;
    phone?: string;
    photo_url?: string;
    created_at?: string;
    updated_at?: string;
}


import { saveUserProfileToFirestore, FirestoreUserProfile } from '../firebase/sync';

// ... existing code ...

export async function createOrUpdateUserProfile(profile: UserProfile) {
    const db = getDb();
    const now = new Date().toISOString();

    // Check if profile exists
    const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM user_profile WHERE firebase_uid = ?',
        [profile.firebase_uid]
    );

    let profileId = existing?.id;

    if (existing) {
        // Update
        await db.runAsync(
            `UPDATE user_profile 
             SET display_name = ?, email = ?, phone = ?, photo_url = ?, updated_at = ?
             WHERE firebase_uid = ?`,
            [profile.display_name || null, profile.email || null, profile.phone || null, profile.photo_url || null, now, profile.firebase_uid]
        );
    } else {
        // Create
        const result = await db.runAsync(
            `INSERT INTO user_profile (firebase_uid, display_name, email, phone, photo_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [profile.firebase_uid, profile.display_name || null, profile.email || null, profile.phone || null, profile.photo_url || null, now, now]
        );
        profileId = result.lastInsertRowId;
    }

    // Sync to Firestore
    const syncProfile: FirestoreUserProfile = {
        id: profileId!, // SQLite ID
        firebase_uid: profile.firebase_uid,
        display_name: profile.display_name,
        email: profile.email,
        phone: profile.phone,
        photo_url: profile.photo_url,
        created_at: profile.created_at || now,
        updated_at: now
    };
    saveUserProfileToFirestore(profile.firebase_uid, syncProfile);

    return profileId;
}

export async function getUserProfile(firebaseUid: string): Promise<UserProfile | null> {
    const db = getDb();
    const profile = await db.getFirstAsync<UserProfile>(
        'SELECT * FROM user_profile WHERE firebase_uid = ?',
        [firebaseUid]
    );
    return profile || null;
}

export async function updateUserProfile(firebaseUid: string, updates: Partial<UserProfile>) {
    const db = getDb();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.display_name !== undefined) {
        fields.push('display_name = ?');
        values.push(updates.display_name);
    }
    if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
    }
    if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone);
    }
    if (updates.photo_url !== undefined) {
        fields.push('photo_url = ?');
        values.push(updates.photo_url);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(firebaseUid);

    if (fields.length > 1) { // More than just updated_at
        await db.runAsync(
            `UPDATE user_profile SET ${fields.join(', ')} WHERE firebase_uid = ?`,
            values
        );

        // Fetch updated profile to sync full object
        const fullProfile = await getUserProfile(firebaseUid);
        if (fullProfile) {
            const syncProfile: FirestoreUserProfile = {
                id: fullProfile.id!,
                firebase_uid: fullProfile.firebase_uid,
                display_name: fullProfile.display_name,
                email: fullProfile.email,
                phone: fullProfile.phone,
                photo_url: fullProfile.photo_url,
                created_at: fullProfile.created_at,
                updated_at: now
            };
            saveUserProfileToFirestore(firebaseUid, syncProfile);
        }
    }
}

export async function deleteUserProfile(firebaseUid: string) {
    const db = getDb();
    await db.runAsync('DELETE FROM user_profile WHERE firebase_uid = ?', [firebaseUid]);
    // Optionally delete from Firestore too, but usually we keep user profiles unless account deleted
}

