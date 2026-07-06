import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveBase64Photo, deletePhoto } from './imageStorage';

const DB_NAME = 'fliptracker.db';
const LEGACY_FLIPS_KEY = '@flip_tracker_flips';
const LEGACY_CURRENCY_KEY = '@flip_tracker_currency';
const MIGRATION_DONE_KEY = '@flip_tracker_sqlite_migrated_v1';

const FLIP_COLUMNS = [
  'itemName', 'category', 'buyPrice', 'sellPrice', 'fees', 'condition',
  'platform', 'status', 'dateBought', 'dateSold', 'notes', 'photo', 'currency',
];

let dbPromise = null;

function getDb() {
  if (!dbPromise) dbPromise = openAndInit();
  return dbPromise;
}

async function openAndInit() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS flips (
      id TEXT PRIMARY KEY NOT NULL,
      itemName TEXT,
      category TEXT,
      buyPrice TEXT,
      sellPrice TEXT,
      fees TEXT,
      condition TEXT,
      platform TEXT,
      status TEXT,
      dateBought TEXT,
      dateSold TEXT,
      notes TEXT,
      photo TEXT,
      currency TEXT,
      createdAt TEXT
    );
  `);
  await migrateFromAsyncStorage(db);
  return db;
}

// One-time move of the old single-blob AsyncStorage list into SQLite rows, so the
// app scales past a few hundred flips without rewriting the entire dataset on every edit.
async function migrateFromAsyncStorage(db) {
  const alreadyDone = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
  if (alreadyDone) return;

  const json = await AsyncStorage.getItem(LEGACY_FLIPS_KEY);
  const legacyCurrency = (await AsyncStorage.getItem(LEGACY_CURRENCY_KEY)) || 'USD';

  if (json) {
    const legacyFlips = JSON.parse(json);
    for (const flip of legacyFlips) {
      let photo = flip.photo || '';
      if (photo.startsWith('data:image')) {
        photo = saveBase64Photo(photo) || '';
      }
      await db.runAsync(
        `INSERT OR REPLACE INTO flips
          (id, itemName, category, buyPrice, sellPrice, fees, condition, platform, status, dateBought, dateSold, notes, photo, currency, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flip.id, flip.itemName || '', flip.category || '', flip.buyPrice || '', flip.sellPrice || '',
          flip.fees || '', flip.condition || '', flip.platform || '', flip.status || '',
          flip.dateBought || '', flip.dateSold || '', flip.notes || '', photo,
          flip.currency || legacyCurrency, flip.createdAt || new Date().toISOString(),
        ]
      );
    }
    await AsyncStorage.removeItem(LEGACY_FLIPS_KEY);
  }
  await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
}

export const loadFlips = async () => {
  try {
    const db = await getDb();
    return await db.getAllAsync('SELECT * FROM flips ORDER BY createdAt DESC');
  } catch (e) {
    console.error('Failed to load flips:', e);
    return [];
  }
};

export const addFlip = async (flip) => {
  const db = await getDb();
  const newFlip = {
    ...flip,
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO flips (id, itemName, category, buyPrice, sellPrice, fees, condition, platform, status, dateBought, dateSold, notes, photo, currency, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newFlip.id,
      ...FLIP_COLUMNS.map((c) => newFlip[c] || ''),
      newFlip.createdAt,
    ]
  );
  return loadFlips();
};

export const updateFlip = async (id, updates) => {
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT * FROM flips WHERE id = ?', [id]);
  if (!existing) return loadFlips();
  const merged = { ...existing, ...updates };

  if ('photo' in updates && updates.photo !== existing.photo) {
    deletePhoto(existing.photo);
  }

  await db.runAsync(
    `UPDATE flips SET ${FLIP_COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...FLIP_COLUMNS.map((c) => merged[c] || ''), id]
  );
  return loadFlips();
};

export const deleteFlip = async (id) => {
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT * FROM flips WHERE id = ?', [id]);
  if (existing) deletePhoto(existing.photo);
  await db.runAsync('DELETE FROM flips WHERE id = ?', [id]);
  return loadFlips();
};

export const clearAllFlips = async () => {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT photo FROM flips');
  rows.forEach((r) => deletePhoto(r.photo));
  await db.runAsync('DELETE FROM flips');
};

export const exportAllData = async () => {
  const [flips, goal] = await Promise.all([loadFlips(), loadGoal()]);
  return {
    exportedAt: new Date().toISOString(),
    goal,
    flips: flips.map(({ photo, ...rest }) => rest), // omit local file uris; they're device-specific
  };
};

const GOAL_KEY = '@flip_tracker_goal';

export const loadGoal = async () => {
  try {
    const val = await AsyncStorage.getItem(GOAL_KEY);
    return val ? parseFloat(val) : 0;
  } catch (e) { return 0; }
};

export const saveGoal = async (goal) => {
  try {
    await AsyncStorage.setItem(GOAL_KEY, String(goal));
  } catch (e) {}
};

export const calcProfit = (flip) => {
  const sell = parseFloat(flip.sellPrice) || 0;
  const buy = parseFloat(flip.buyPrice) || 0;
  const fees = parseFloat(flip.fees) || 0;
  return sell - buy - fees;
};

export const isRealized = (flip) => flip.status === 'Sold';

/** Days between purchase and sale, or null if either date is missing/invalid/negative. */
export const calcDaysToSell = (flip) => {
  if (!flip.dateBought || !flip.dateSold) return null;
  const bought = new Date(flip.dateBought);
  const sold = new Date(flip.dateSold);
  if (isNaN(bought) || isNaN(sold)) return null;
  const days = Math.round((sold - bought) / 86400000);
  return days >= 0 ? days : null;
};
