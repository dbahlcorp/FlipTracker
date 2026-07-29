import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveBase64Photo, deletePhoto } from './imageStorage';

const DB_NAME = 'fliptracker.db';
const LEGACY_FLIPS_KEY = '@flip_tracker_flips';
const LEGACY_CURRENCY_KEY = '@flip_tracker_currency';
const MIGRATION_DONE_KEY = '@flip_tracker_sqlite_migrated_v1';

const FLIP_COLUMNS = [
  'itemName', 'category', 'materialCost', 'consumables', 'labourTime', 'laserTime',
  'packaging', 'shipping', 'marketplaceFees', 'sellingPrice', 'condition',
  'platform', 'status', 'dateBought', 'dateSold', 'notes', 'photo', 'currency', 'quantity',
];

// Columns renamed since the original schema, in {from, to} order. Applied via
// ALTER TABLE ... RENAME COLUMN on every startup; each is a no-op once already renamed.
const RENAMED_COLUMNS = [
  { from: 'buyPrice', to: 'materialCost' },
  { from: 'sellPrice', to: 'sellingPrice' },
  { from: 'fees', to: 'marketplaceFees' },
];

// Columns added since the original schema (beyond `quantity`, which predates this list).
const ADDED_COLUMNS = ['consumables', 'labourTime', 'laserTime', 'packaging', 'shipping'];

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
      materialCost TEXT,
      consumables TEXT,
      labourTime TEXT,
      laserTime TEXT,
      packaging TEXT,
      shipping TEXT,
      marketplaceFees TEXT,
      sellingPrice TEXT,
      condition TEXT,
      platform TEXT,
      status TEXT,
      dateBought TEXT,
      dateSold TEXT,
      notes TEXT,
      photo TEXT,
      currency TEXT,
      quantity TEXT,
      createdAt TEXT
    );
  `);
  // Databases created before the quantity column existed need it added in place.
  try {
    await db.execAsync(`ALTER TABLE flips ADD COLUMN quantity TEXT;`);
  } catch (e) {}
  // Databases created under the old buyPrice/sellPrice/fees schema need those
  // columns renamed in place. No-op (throws, caught) once already renamed.
  for (const { from, to } of RENAMED_COLUMNS) {
    try {
      await db.execAsync(`ALTER TABLE flips RENAME COLUMN ${from} TO ${to};`);
    } catch (e) {}
  }
  // Databases created before the material/labour/laser/packaging/shipping cost
  // fields existed need them added in place.
  for (const column of ADDED_COLUMNS) {
    try {
      await db.execAsync(`ALTER TABLE flips ADD COLUMN ${column} TEXT;`);
    } catch (e) {}
  }
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
      // Legacy exports may predate the material/labour/laser cost fields, or still use
      // the old buyPrice/sellPrice/fees names — fall back to those where present.
      await db.runAsync(
        `INSERT OR REPLACE INTO flips
          (id, itemName, category, materialCost, consumables, labourTime, laserTime, packaging, shipping, marketplaceFees, sellingPrice, condition, platform, status, dateBought, dateSold, notes, photo, currency, quantity, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flip.id, flip.itemName || '', flip.category || '',
          flip.materialCost || flip.buyPrice || '', flip.consumables || '',
          flip.labourTime || '', flip.laserTime || '', flip.packaging || '', flip.shipping || '',
          flip.marketplaceFees || flip.fees || '', flip.sellingPrice || flip.sellPrice || '',
          flip.condition || '', flip.platform || '', flip.status || '',
          flip.dateBought || '', flip.dateSold || '', flip.notes || '', photo,
          flip.currency || legacyCurrency, flip.quantity || '1', flip.createdAt || new Date().toISOString(),
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
    `INSERT INTO flips (id, ${FLIP_COLUMNS.join(', ')}, createdAt)
     VALUES (?, ${FLIP_COLUMNS.map(() => '?').join(', ')}, ?)`,
    [
      newFlip.id,
      ...FLIP_COLUMNS.map((c) => newFlip[c] || (c === 'quantity' ? '1' : '')),
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

export const getQuantity = (flip) => parseFloat(flip.quantity) || 1;

const DEFAULT_RATES = { labourRate: 0, laserRate: 0 };

// Labour/laser cost are never stored on the flip — like currency conversion, they're
// derived live from the *current* hourly rate in Settings, not the rate at entry time.
export const calcLabourCost = (flip, rates = DEFAULT_RATES) =>
  ((parseFloat(flip.labourTime) || 0) / 60) * (rates.labourRate || 0);

export const calcLaserCost = (flip, rates = DEFAULT_RATES) =>
  ((parseFloat(flip.laserTime) || 0) / 60) * (rates.laserRate || 0);

/** Sum of all cost fields for a single unit, including derived labour/laser cost. */
export const calcPerUnitCost = (flip, rates = DEFAULT_RATES) =>
  (parseFloat(flip.materialCost) || 0) +
  (parseFloat(flip.consumables) || 0) +
  calcLabourCost(flip, rates) +
  calcLaserCost(flip, rates) +
  (parseFloat(flip.packaging) || 0) +
  (parseFloat(flip.shipping) || 0) +
  (parseFloat(flip.marketplaceFees) || 0);

export const calcTotalCost = (flip, rates = DEFAULT_RATES) =>
  calcPerUnitCost(flip, rates) * getQuantity(flip);

export const calcProfit = (flip, rates = DEFAULT_RATES) => {
  const sell = parseFloat(flip.sellingPrice) || 0;
  return sell * getQuantity(flip) - calcTotalCost(flip, rates);
};

export const calcMargin = (flip, rates = DEFAULT_RATES) => {
  const revenue = (parseFloat(flip.sellingPrice) || 0) * getQuantity(flip);
  return revenue > 0 ? (calcProfit(flip, rates) / revenue) * 100 : 0;
};

/** Units that must sell to recoup total cost, or null if per-unit profit isn't positive. */
export const calcBreakEvenQuantity = (flip, rates = DEFAULT_RATES) => {
  const sell = parseFloat(flip.sellingPrice) || 0;
  const perUnitCost = calcPerUnitCost(flip, rates);
  const profitPerUnit = sell - perUnitCost;
  if (profitPerUnit <= 0) return null;
  return Math.ceil(calcTotalCost(flip, rates) / profitPerUnit);
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
