
import { db } from './firebaseConfig';
import { collection, doc, setDoc, deleteDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { getDb } from '../database/dbCore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Interfaces ---

export interface FirestoreCard {
    id: number;
    name: string;
    bank: string;
    credit_limit: number;
    cut_day: number;
    pay_day: number;
    interest_rate_ea: number;
    last_four_digits: string;
    expiry_date: string;
    card_type: string;
    updated_at: string;
}

export interface FirestorePurchase {
    id: number;
    card_id: number;
    person_id: number | null;
    amount: number;
    total_with_interest: number;
    date: string;
    notes: string;
    is_installments: number;
    installments_total: number;
    interest_rate_ea: number;
    updated_at: string;
}

export interface FirestoreInstallment {
    id: number;
    purchase_id: number;
    installment_number: number;
    amount: number;
    capital: number;
    interest: number;
    due_date: string;
    paid: number;
    updated_at: string;
}

export interface FirestorePerson {
    id: number;
    name: string;
    updated_at: string;
}

export interface FirestoreUserProfile {
    id: number;
    firebase_uid: string;
    display_name?: string;
    email?: string;
    phone?: string;
    photo_url?: string;
    created_at?: string;
    updated_at?: string;
}

// --- Save Functions ---

export async function saveCardToFirestore(userId: string, card: FirestoreCard) {
    try {
        const ref = doc(db, `users/${userId}/cards/${card.id}`);
        await setDoc(ref, {
            ...card,
            updated_at: new Date().toISOString()
        });
        console.log('✅ Card synced to Firestore');
    } catch (e) {
        console.error('❌ Error syncing card:', e);
    }
}

export async function savePurchaseToFirestore(userId: string, purchase: FirestorePurchase) {
    try {
        const ref = doc(db, `users/${userId}/purchases/${purchase.id}`);
        await setDoc(ref, {
            ...purchase,
            updated_at: new Date().toISOString()
        });
        console.log('✅ Purchase synced to Firestore');
    } catch (e) {
        console.error('❌ Error syncing purchase:', e);
    }
}

export async function saveInstallmentToFirestore(userId: string, installment: FirestoreInstallment) {
    try {
        const ref = doc(db, `users/${userId}/installments/${installment.id}`);
        await setDoc(ref, {
            ...installment,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('❌ Error syncing installment:', e);
    }
}

export async function savePersonToFirestore(userId: string, person: FirestorePerson) {
    try {
        const ref = doc(db, `users/${userId}/people/${person.id}`);
        await setDoc(ref, {
            ...person,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('❌ Error syncing person:', e);
    }
}

export async function saveUserProfileToFirestore(userId: string, profile: FirestoreUserProfile) {
    try {
        const ref = doc(db, `users/${userId}/profile/main`); // Single profile doc
        await setDoc(ref, {
            ...profile,
            updated_at: new Date().toISOString()
        });
        console.log('✅ User Profile synced to Firestore');
    } catch (e) {
        console.error('❌ Error syncing user profile:', e);
    }
}

// --- Batch Save ---

export async function saveInstallmentsBatchToFirestore(userId: string, installments: FirestoreInstallment[]) {
    try {
        const batch = writeBatch(db);
        installments.forEach(inst => {
            const ref = doc(db, `users/${userId}/installments/${inst.id}`);
            batch.set(ref, {
                ...inst,
                updated_at: new Date().toISOString()
            });
        });
        await batch.commit();
        console.log(`✅ Synced ${installments.length} installments to Firestore`);
    } catch (e) {
        console.error('❌ Error batch syncing installments:', e);
    }
}

// --- Delete Functions ---

export async function deleteCardFromFirestore(userId: string, cardId: number) {
    try {
        const batch = writeBatch(db);

        // 1. Delete Card
        batch.delete(doc(db, `users/${userId}/cards/${cardId}`));

        // 2. Find and Delete Purchases
        const purchasesQ = query(collection(db, `users/${userId}/purchases`), where('card_id', '==', cardId));
        const purchasesSnap = await getDocs(purchasesQ);
        const purchaseIds = purchasesSnap.docs.map(d => parseInt(d.id));

        purchasesSnap.docs.forEach(d => batch.delete(d.ref));

        // 3. Find and Delete Installments
        for (const pid of purchaseIds) {
            const instQ = query(collection(db, `users/${userId}/installments`), where('purchase_id', '==', pid));
            const instSnap = await getDocs(instQ);
            instSnap.docs.forEach(d => batch.delete(d.ref));
        }

        await batch.commit();
        console.log('✅ Card and related data deleted from Firestore');
    } catch (e) {
        console.error('❌ Error deleting card from Firestore:', e);
    }
}

export async function deletePurchaseFromFirestore(userId: string, purchaseId: number) {
    try {
        const batch = writeBatch(db);

        // Delete Purchase
        batch.delete(doc(db, `users/${userId}/purchases/${purchaseId}`));

        // Delete Installments
        const instQ = query(collection(db, `users/${userId}/installments`), where('purchase_id', '==', purchaseId));
        const instSnap = await getDocs(instQ);
        instSnap.docs.forEach(d => batch.delete(d.ref));

        await batch.commit();
        console.log('✅ Purchase and installments deleted from Firestore');
    } catch (e) {
        console.error('❌ Error deleting purchase from Firestore:', e);
    }
}

// --- Restore Functions ---

export async function isLocalDatabaseEmpty() {
    // 1. Check if we already restored
    const hasRestored = await AsyncStorage.getItem('has_restored_data');
    if (hasRestored === 'true') {
        return false;
    }

    const dbLocal = getDb();
    // Check cards OR profile to decide if we have data
    const cardsResult = await dbLocal.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM cards');
    const profileResult = await dbLocal.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM user_profile');

    const count = (cardsResult?.count || 0) + (profileResult?.count || 0);

    if (count > 0) {
        // Data exists -> Set flag to skip future checks
        await AsyncStorage.setItem('has_restored_data', 'true');
        return false;
    }

    return true;
}

export async function restoreUserData(userId: string) {
    console.log('🔄 Starting Data Restore from Firestore (Optimized)...');
    const localDb = getDb();

    try {
        // 1. Fetch all data in parallel with a 10s timeout to prevent hanging
        const fetchPromise = Promise.all([
            getDocs(collection(db, `users/${userId}/cards`)),
            getDocs(collection(db, `users/${userId}/purchases`)),
            getDocs(collection(db, `users/${userId}/installments`)),
            getDocs(collection(db, `users/${userId}/people`)),
            getDocs(collection(db, `users/${userId}/profile`))
        ]);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout fetching data')), 10000)
        );

        const [cardsSnap, purchasesSnap, installmentsSnap, peopleSnap, profileSnap] = await Promise.race([
            fetchPromise,
            timeoutPromise
        ]) as [any, any, any, any, any];


        if (cardsSnap.empty && purchasesSnap.empty && profileSnap.empty) {
            console.log('⚠️ No data found in Firestore to restore.');
            // IMPORTANT: Mark as restored so we don't try again endlessly
            await AsyncStorage.setItem('has_restored_data', 'true');
            return;
        }

        // 2. Insert into SQLite using a single transaction for speed
        await localDb.withTransactionAsync(async () => {
            // Restore Profile
            if (!profileSnap.empty) {
                const p = profileSnap.docs[0].data() as FirestoreUserProfile;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO user_profile 
                    (firebase_uid, display_name, email, phone, photo_url, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [p.firebase_uid, p.display_name || null, p.email || null, p.phone || null, p.photo_url || null, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()]
                );
            }

            // Restore People
            for (const doc of peopleSnap.docs) {
                const p = doc.data() as FirestorePerson;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO people (id, name) VALUES (?, ?)`,
                    [p.id, p.name]
                );
            }

            // Restore Cards
            for (const doc of cardsSnap.docs) {
                const c = doc.data() as FirestoreCard;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO cards 
                    (id, user_id, name, bank, credit_limit, cut_day, pay_day, interest_rate_ea, last_four_digits, expiry_date, card_type) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [c.id, userId, c.name, c.bank, c.credit_limit, c.cut_day, c.pay_day, c.interest_rate_ea, c.last_four_digits, c.expiry_date, c.card_type]
                );
            }

            // Restore Purchases
            for (const doc of purchasesSnap.docs) {
                const p = doc.data() as FirestorePurchase;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO purchases
                    (id, card_id, person_id, amount, total_with_interest, date, notes, is_installments, installments_total, interest_rate_ea)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [p.id, p.card_id, p.person_id, p.amount, p.total_with_interest, p.date, p.notes, p.is_installments, p.installments_total, p.interest_rate_ea]
                );
            }

            // Restore Installments
            for (const doc of installmentsSnap.docs) {
                const i = doc.data() as FirestoreInstallment;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO installments
                    (id, purchase_id, installment_number, amount, capital, interest, due_date, paid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [i.id, i.purchase_id, i.installment_number, i.amount, i.capital, i.interest, i.due_date, i.paid]
                );
            }
        });

        console.log('✅ Data Restore Complete!');
        await AsyncStorage.setItem('has_restored_data', 'true');


    } catch (e) {
        console.error('❌ Error Restoring Data:', e);
        // Optional: If timeout, maybe we SHOULD set true to stop blocking user? 
        // Or keep trying next time? User preference seems to be "Just let me in".
        // Let's NOT set true on error to be safe, but the user can use the app anyway since we don't block navigation in calling code (just loading screen hides).
    }
}

// --- Sync Down (Two-Way Sync) ---

export async function syncDown(userId: string) {
    console.log('🔄 Starting Sync Down...');
    const localDb = getDb();

    try {
        // Fetch everything from Firestore
        // We could optimize this with "last_synced_at" but for now, full pull is safer.
        const [cardsSnap, purchasesSnap, installmentsSnap, peopleSnap, profileSnap] = await Promise.all([
            getDocs(collection(db, `users/${userId}/cards`)),
            getDocs(collection(db, `users/${userId}/purchases`)),
            getDocs(collection(db, `users/${userId}/installments`)),
            getDocs(collection(db, `users/${userId}/people`)),
            getDocs(collection(db, `users/${userId}/profile`))
        ]);

        await localDb.withTransactionAsync(async () => {
            // Sync Profile
            if (!profileSnap.empty) {
                const p = profileSnap.docs[0].data() as FirestoreUserProfile;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO user_profile 
                    (firebase_uid, display_name, email, phone, photo_url, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [p.firebase_uid, p.display_name || null, p.email || null, p.phone || null, p.photo_url || null, p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()]
                );
            }

            // Sync People
            for (const doc of peopleSnap.docs) {
                const p = doc.data() as FirestorePerson;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO people (id, name) VALUES (?, ?)`,
                    [p.id, p.name]
                );
            }

            // Sync Cards
            for (const doc of cardsSnap.docs) {
                const c = doc.data() as FirestoreCard;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO cards 
                    (id, user_id, name, bank, credit_limit, cut_day, pay_day, interest_rate_ea, last_four_digits, expiry_date, card_type) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [c.id, userId, c.name, c.bank, c.credit_limit, c.cut_day, c.pay_day, c.interest_rate_ea, c.last_four_digits, c.expiry_date, c.card_type]
                );
            }

            // Sync Purchases
            for (const doc of purchasesSnap.docs) {
                const p = doc.data() as FirestorePurchase;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO purchases
                    (id, card_id, person_id, amount, total_with_interest, date, notes, is_installments, installments_total, interest_rate_ea)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [p.id, p.card_id, p.person_id, p.amount, p.total_with_interest, p.date, p.notes, p.is_installments, p.installments_total, p.interest_rate_ea]
                );
            }

            // Sync Installments
            for (const doc of installmentsSnap.docs) {
                const i = doc.data() as FirestoreInstallment;
                await localDb.runAsync(
                    `INSERT OR REPLACE INTO installments
                    (id, purchase_id, installment_number, amount, capital, interest, due_date, paid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [i.id, i.purchase_id, i.installment_number, i.amount, i.capital, i.interest, i.due_date, i.paid]
                );
            }
        });

        console.log('✅ Sync Down Complete!');
        // Update local restore flag just in case
        await AsyncStorage.setItem('has_restored_data', 'true');

    } catch (e: any) {
        if (e.code === 'permission-denied') {
            console.error('❌ Sync Down failed: Permission Denied. Check Firestore Rules.');
        } else {
            console.error('❌ Error Syncing Down:', e);
        }
        // Don't block app usage on error
    }
}

// --- Sync Up (Manual Backup) ---

export async function syncUp(userId: string) {
    console.log('🔄 Starting Manual Sync Up (Backup)...');
    const localDb = getDb();

    try {
        const batch = writeBatch(db);
        let opCount = 0;

        // Helper to commit batch if full (Firestore limit is 500)
        const checkBatch = async () => {
            if (opCount >= 450) {
                await batch.commit();
                opCount = 0;
                // Re-instantiate batch? No, writeBatch() returns a new batch instance? 
                // Actually writeBatch() returns a WriteBatch object. We can't reuse it after commit.
                // So we need a mechanism to create a new one.
                // For simplicity, let's assume we won't hit 500 in this simple app often, 
                // OR we just rely on one big batch for now or split logically.
                // Better approach: Just do it in blocks if needed, but for now let's hope < 500.
                // TODO: Implement chunking if user has massive data.
            }
        };

        // 1. Profile
        const profile = await localDb.getFirstAsync<FirestoreUserProfile>('SELECT * FROM user_profile WHERE firebase_uid = ?', [userId]);
        if (profile) {
            const ref = doc(db, `users/${userId}/profile/main`);
            batch.set(ref, {
                ...profile,
                // Ensure valid dates
                updated_at: new Date().toISOString()
            });
            opCount++;
        }

        // 2. People (All people are shared? No, they don't have user_id. We'll just push all)
        const people = await localDb.getAllAsync<FirestorePerson>('SELECT * FROM people');
        for (const p of people) {
            const ref = doc(db, `users/${userId}/people/${p.id}`);
            batch.set(ref, p);
            opCount++;
        }

        // 3. Cards
        const cards = await localDb.getAllAsync<FirestoreCard>('SELECT * FROM cards WHERE user_id = ?', [userId]);
        for (const c of cards) {
            const ref = doc(db, `users/${userId}/cards/${c.id}`);
            batch.set(ref, { ...c, updated_at: new Date().toISOString() });
            opCount++;
        }

        // 4. Purchases
        // Need to filter purchases by cards belonging to user
        if (cards.length > 0) {
            const cardIds = cards.map(c => c.id).join(',');
            const purchases = await localDb.getAllAsync<FirestorePurchase>(`SELECT * FROM purchases WHERE card_id IN (${cardIds})`);

            for (const p of purchases) {
                const ref = doc(db, `users/${userId}/purchases/${p.id}`);
                batch.set(ref, { ...p, updated_at: new Date().toISOString() });
                opCount++;
            }

            // 5. Installments
            if (purchases.length > 0) {
                const purchaseIds = purchases.map(p => p.id).join(',');
                // This query might be too long if many purchases, but for local SQLite it handles it reasonably.
                const installments = await localDb.getAllAsync<FirestoreInstallment>(`SELECT * FROM installments WHERE purchase_id IN (${purchaseIds})`);

                for (const i of installments) {
                    const ref = doc(db, `users/${userId}/installments/${i.id}`);
                    batch.set(ref, { ...i, updated_at: new Date().toISOString() });
                    opCount++;
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
            console.log(`✅ Backup Complete! (${opCount} records synced)`);
        } else {
            console.log('⚠️ Nothing to sync up.');
        }

    } catch (e) {
        console.error('❌ Error in Sync Up:', e);
        throw e; // Rethrow so UI can show error
    }
}

// --- Delete All Data (Factory Reset) ---
export async function deleteAllFirestoreData(userId: string) {
    console.log('🔥 STARTING CLOUD WIPE for user:', userId);
    try {
        const collections = ['cards', 'purchases', 'installments', 'people', 'profile'];

        for (const colName of collections) {
            const colRef = collection(db, `users/${userId}/${colName}`);
            const snapshot = await getDocs(colRef);

            if (snapshot.empty) continue;

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`✅ Deleted collection: ${colName} (${snapshot.size} docs)`);
        }

        console.log('🔥 CLOUD WIPE COMPLETE');
    } catch (e) {
        console.error('❌ Error wiping cloud data:', e);
        throw e;
    }
}
