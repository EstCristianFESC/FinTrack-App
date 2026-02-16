
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export async function initDatabase() {
    db = await SQLite.openDatabaseAsync('fintrack_pro.db');

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            bank TEXT,
            credit_limit REAL NOT NULL,
            cut_day INTEGER NOT NULL,
            pay_day INTEGER NOT NULL,
            interest_rate_ea REAL NOT NULL DEFAULT 0,
            last_four_digits TEXT,
            expiry_date TEXT
        );
    `);

    // Migraciones robustas
    try {
        const tableInfo = await db.getAllAsync('PRAGMA table_info(cards)');
        const columnNames = (tableInfo as any[]).map(col => col.name);

        if (!columnNames.includes('last_four_digits')) {
            await db.execAsync('ALTER TABLE cards ADD COLUMN last_four_digits TEXT');
        }
        if (!columnNames.includes('expiry_date')) {
            await db.execAsync('ALTER TABLE cards ADD COLUMN expiry_date TEXT');
        }
        if (!columnNames.includes('card_type')) {
            await db.execAsync('ALTER TABLE cards ADD COLUMN card_type TEXT DEFAULT "visa"');
            console.log('✅ Columna card_type agregada correctamente');
        }
    } catch (e) {
        console.error('Error en migración de columnas:', e);
    }

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
    `);

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            person_id INTEGER,
            amount REAL NOT NULL,
            total_with_interest REAL NOT NULL,
            date TEXT NOT NULL,
            notes TEXT,
            is_installments INTEGER NOT NULL,
            installments_total INTEGER,
            interest_rate_ea REAL,
            FOREIGN KEY (card_id) REFERENCES cards(id),
            FOREIGN KEY (person_id) REFERENCES people(id)
        );
    `);

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS installments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INTEGER NOT NULL,
            installment_number INTEGER NOT NULL,
            amount REAL NOT NULL,
            capital REAL NOT NULL,
            interest REAL NOT NULL,
            due_date TEXT NOT NULL,
            paid INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id)
        );
    `);

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firebase_uid TEXT UNIQUE NOT NULL,
            display_name TEXT,
            email TEXT,
            phone TEXT,
            photo_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS period_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            period_iso TEXT NOT NULL,
            is_paid INTEGER DEFAULT 0,
            FOREIGN KEY (card_id) REFERENCES cards(id)
        );
    `);

    console.log('✅ Base de datos PRO inicializada correctamente');
}

export function getDb() {
    if (!db) {
        throw new Error('❌ Base de datos no inicializada');
    }
    return db;
}
