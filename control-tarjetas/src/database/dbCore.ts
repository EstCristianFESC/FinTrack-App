import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

let db: SQLite.SQLiteDatabase;

export async function initDatabase() {
    db = await SQLite.openDatabaseAsync('fintrack_pro.db');

    // Habilitar WAL mode para mejorar concurrencia y evitar "database is locked"
    try {
        await db.execAsync('PRAGMA journal_mode = WAL;');
        console.log('✅ WAL Mode habilitado');
    } catch (e) {
        console.log('⚠️ Warning: No se pudo habilitar WAL (posible lock previo):', e);
    }

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT NOT NULL,
            bank TEXT,
            credit_limit REAL NOT NULL,
            cut_day INTEGER NOT NULL,
            pay_day INTEGER NOT NULL,
            interest_rate_ea REAL NOT NULL DEFAULT 0,
            last_four_digits TEXT,
            expiry_date TEXT,
            card_type TEXT DEFAULT "visa"
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
        if (!columnNames.includes('user_id')) {
            await db.execAsync('ALTER TABLE cards ADD COLUMN user_id TEXT');
            console.log('✅ Columna user_id agregada correctamente');
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

    // --- Índices para Optimización ---
    try {
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_purchases_card_id ON purchases(card_id);
            CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
            CREATE INDEX IF NOT EXISTS idx_installments_purchase_id ON installments(purchase_id);
            CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
            CREATE INDEX IF NOT EXISTS idx_installments_paid ON installments(paid);
            CREATE INDEX IF NOT EXISTS idx_period_status_card_period ON period_status(card_id, period_iso);
        `);
        console.log('✅ Índices creados/verificados');
    } catch (e) {
        console.error('⚠️ Error creando índices:', e);
    }
}

export async function deleteDatabaseFile() {
    try {
        // @ts-ignore
        if (!FileSystem.documentDirectory) {
            console.error('❌ FileSystem.documentDirectory is null, cannot delete DB file.');
            throw new Error('FileSystem.documentDirectory is null');
        }

        if (db) {
            await db.closeAsync();
        }

        // @ts-ignore
        const dbDir = FileSystem.documentDirectory + 'SQLite';
        const dbPath = dbDir + '/fintrack_pro.db';
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';

        // Delete main DB file
        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(dbPath);
            console.log('✅ Base de datos eliminada físicamente');
        }

        // Delete WAL files if they exist
        const walInfo = await FileSystem.getInfoAsync(walPath);
        if (walInfo.exists) {
            await FileSystem.deleteAsync(walPath);
        }
        const shmInfo = await FileSystem.getInfoAsync(shmPath);
        if (shmInfo.exists) {
            await FileSystem.deleteAsync(shmPath);
        }

        console.log('✅ Archivos de base de datos eliminados correctamente');

    } catch (e) {
        console.error('❌ Error eliminando archivo de base de datos:', e);
        throw e;
    }
}

export function getDb() {
    if (!db) {
        throw new Error('❌ Base de datos no inicializada');
    }
    return db;
}
