import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveBase64Photo, readPhotoAsDataUri, deletePhoto } from './imageStorage';

const DB_NAME = 'fliptracker.db';
const LEGACY_FLIPS_KEY = '@flip_tracker_flips';
const LEGACY_CURRENCY_KEY = '@flip_tracker_currency';
const MIGRATION_DONE_KEY = '@flip_tracker_sqlite_migrated_v1';

const FLIP_COLUMNS = [
  'itemName', 'materialCost', 'consumables', 'labourTime', 'laserTime',
  'packaging', 'shipping', 'marketplaceFees', 'sellingPrice',
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

// A template is a saved cost "recipe" for a product you make repeatedly — the same
// cost fields as a flip, minus the per-batch specifics (quantity, dates, status, notes, photo).
const TEMPLATE_COLUMNS = [
  'name', 'materialCost', 'consumables', 'labourTime', 'laserTime',
  'packaging', 'shipping', 'marketplaceFees', 'sellingPrice', 'platform',
];

const MATERIAL_COLUMNS = [
  'name', 'type', 'costPerPiece', 'quantity', 'unit',
  'width', 'height', 'thickness', 'supplier', 'notes', 'currency',
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
      materialCost TEXT,
      consumables TEXT,
      labourTime TEXT,
      laserTime TEXT,
      packaging TEXT,
      shipping TEXT,
      marketplaceFees TEXT,
      sellingPrice TEXT,
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
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      materialCost TEXT,
      consumables TEXT,
      labourTime TEXT,
      laserTime TEXT,
      packaging TEXT,
      shipping TEXT,
      marketplaceFees TEXT,
      sellingPrice TEXT,
      platform TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      type TEXT,
      costPerPiece TEXT,
      quantity TEXT,
      unit TEXT,
      width TEXT,
      height TEXT,
      thickness TEXT,
      supplier TEXT,
      notes TEXT,
      currency TEXT,
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
      // the old buyPrice/sellPrice/fees names — fall back to those where present. Any
      // legacy category/condition values are dropped; those fields no longer exist.
      await db.runAsync(
        `INSERT OR REPLACE INTO flips
          (id, itemName, materialCost, consumables, labourTime, laserTime, packaging, shipping, marketplaceFees, sellingPrice, platform, status, dateBought, dateSold, notes, photo, currency, quantity, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flip.id, flip.itemName || '',
          flip.materialCost || flip.buyPrice || '', flip.consumables || '',
          flip.labourTime || '', flip.laserTime || '', flip.packaging || '', flip.shipping || '',
          flip.marketplaceFees || flip.fees || '', flip.sellingPrice || flip.sellPrice || '',
          flip.platform || '', flip.status || '',
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

export const loadTemplates = async () => {
  try {
    const db = await getDb();
    return await db.getAllAsync('SELECT * FROM templates ORDER BY createdAt DESC');
  } catch (e) {
    console.error('Failed to load templates:', e);
    return [];
  }
};

export const addTemplate = async (template) => {
  const db = await getDb();
  const newTemplate = {
    ...template,
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO templates (id, ${TEMPLATE_COLUMNS.join(', ')}, createdAt)
     VALUES (?, ${TEMPLATE_COLUMNS.map(() => '?').join(', ')}, ?)`,
    [
      newTemplate.id,
      ...TEMPLATE_COLUMNS.map((c) => newTemplate[c] || ''),
      newTemplate.createdAt,
    ]
  );
  return loadTemplates();
};

export const updateTemplate = async (id, updates) => {
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT * FROM templates WHERE id = ?', [id]);
  if (!existing) return loadTemplates();
  const merged = { ...existing, ...updates };
  await db.runAsync(
    `UPDATE templates SET ${TEMPLATE_COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...TEMPLATE_COLUMNS.map((c) => merged[c] || ''), id]
  );
  return loadTemplates();
};

export const deleteTemplate = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
  return loadTemplates();
};

export const loadMaterials = async () => {
  try {
    const db = await getDb();
    return await db.getAllAsync(
      'SELECT * FROM materials ORDER BY name COLLATE NOCASE ASC, createdAt DESC'
    );
  } catch (e) {
    console.error('Failed to load materials:', e);
    return [];
  }
};

export const addMaterial = async (material) => {
  const db = await getDb();
  const newMaterial = {
    ...material,
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO materials (id, ${MATERIAL_COLUMNS.join(', ')}, createdAt)
     VALUES (?, ${MATERIAL_COLUMNS.map(() => '?').join(', ')}, ?)`,
    [
      newMaterial.id,
      ...MATERIAL_COLUMNS.map((column) => newMaterial[column] || ''),
      newMaterial.createdAt,
    ]
  );
  return loadMaterials();
};

export const updateMaterial = async (id, updates) => {
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT * FROM materials WHERE id = ?', [id]);
  if (!existing) return loadMaterials();
  const merged = { ...existing, ...updates };
  await db.runAsync(
    `UPDATE materials SET ${MATERIAL_COLUMNS.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
    [...MATERIAL_COLUMNS.map((column) => merged[column] || ''), id]
  );
  return loadMaterials();
};

export const deleteMaterial = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM materials WHERE id = ?', [id]);
  return loadMaterials();
};

export const calcMaterialValue = (material) =>
  (parseFloat(material.costPerPiece) || 0) * (parseFloat(material.quantity) || 0);

export const exportAllData = async () => {
  const [flips, templates, materials, goal, currency, labourRate, laserRate, theme] = await Promise.all([
    loadFlips(),
    loadTemplates(),
    loadMaterials(),
    loadGoal(),
    AsyncStorage.getItem('@flip_tracker_currency'),
    AsyncStorage.getItem('@flip_tracker_labour_rate'),
    AsyncStorage.getItem('@flip_tracker_laser_rate'),
    AsyncStorage.getItem('@flip_tracker_theme'),
  ]);
  const portableFlips = await Promise.all(flips.map(async (flip) => ({
    ...flip,
    photo: await readPhotoAsDataUri(flip.photo),
  })));

  return {
    format: 'kerf-backup',
    // v2 adds materials. Older Kerf builds reject this version instead of
    // accepting the backup and silently dropping the inventory.
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: {
      goal,
      currency: currency || 'USD',
      labourRate: parseFloat(labourRate) || 0,
      laserRate: parseFloat(laserRate) || 0,
      theme: theme === 'dark' ? 'dark' : 'light',
    },
    jobs: portableFlips,
    templates,
    materials,
  };
};

const BACKUP_REQUIRED_JOB_FIELDS = ['id', 'itemName', 'createdAt'];
const BACKUP_REQUIRED_MATERIAL_FIELDS = ['id', 'name', 'createdAt'];

export const validateBackup = (data) => {
  if (!data || data.format !== 'kerf-backup' || ![1, 2].includes(data.version)) {
    throw new Error('This is not a supported Kerf backup.');
  }
  if (!Array.isArray(data.jobs) || !Array.isArray(data.templates)) {
    throw new Error('The backup is missing jobs or templates.');
  }
  if (data.materials !== undefined && !Array.isArray(data.materials)) {
    throw new Error('The backup contains invalid materials.');
  }
  if (data.jobs.some((job) => BACKUP_REQUIRED_JOB_FIELDS.some((field) => typeof job[field] !== 'string'))) {
    throw new Error('The backup contains an invalid job.');
  }
  if ((data.materials || []).some((material) =>
    BACKUP_REQUIRED_MATERIAL_FIELDS.some((field) => typeof material[field] !== 'string')
  )) {
    throw new Error('The backup contains an invalid material.');
  }
  return {
    jobCount: data.jobs.length,
    templateCount: data.templates.length,
    materialCount: data.materials?.length || 0,
    exportedAt: data.exportedAt,
  };
};

/** Replaces local data only after the caller has validated the file and confirmed the action. */
export const importAllData = async (data) => {
  validateBackup(data);
  const db = await getDb();
  const oldPhotos = await db.getAllAsync('SELECT photo FROM flips');
  const restoredJobs = data.jobs.map((job) => ({
    ...job,
    photo: job.photo ? (saveBase64Photo(job.photo) || '') : '',
  }));

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.execAsync('DELETE FROM flips; DELETE FROM templates; DELETE FROM materials;');
    for (const job of restoredJobs) {
      await db.runAsync(
        `INSERT INTO flips (id, ${FLIP_COLUMNS.join(', ')}, createdAt)
         VALUES (?, ${FLIP_COLUMNS.map(() => '?').join(', ')}, ?)`,
        [
          job.id,
          ...FLIP_COLUMNS.map((column) => job[column] || (column === 'quantity' ? '1' : '')),
          job.createdAt,
        ]
      );
    }
    for (const template of data.templates) {
      await db.runAsync(
        `INSERT INTO templates (id, ${TEMPLATE_COLUMNS.join(', ')}, createdAt)
         VALUES (?, ${TEMPLATE_COLUMNS.map(() => '?').join(', ')}, ?)`,
        [
          template.id || `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          ...TEMPLATE_COLUMNS.map((column) => template[column] || ''),
          template.createdAt || new Date().toISOString(),
        ]
      );
    }
    for (const material of data.materials || []) {
      await db.runAsync(
        `INSERT INTO materials (id, ${MATERIAL_COLUMNS.join(', ')}, createdAt)
         VALUES (?, ${MATERIAL_COLUMNS.map(() => '?').join(', ')}, ?)`,
        [
          material.id || `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          ...MATERIAL_COLUMNS.map((column) => material[column] || ''),
          material.createdAt || new Date().toISOString(),
        ]
      );
    }
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    restoredJobs.forEach((job) => deletePhoto(job.photo));
    throw error;
  }

  oldPhotos.forEach((row) => deletePhoto(row.photo));
  const settings = data.settings || {};
  await Promise.all([
    AsyncStorage.setItem(GOAL_KEY, String(parseFloat(settings.goal) || 0)),
    AsyncStorage.setItem('@flip_tracker_currency', settings.currency || 'USD'),
    AsyncStorage.setItem('@flip_tracker_labour_rate', String(parseFloat(settings.labourRate) || 0)),
    AsyncStorage.setItem('@flip_tracker_laser_rate', String(parseFloat(settings.laserRate) || 0)),
    AsyncStorage.setItem('@flip_tracker_theme', settings.theme === 'dark' ? 'dark' : 'light'),
  ]);

  return validateBackup(data);
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

export const clearAllData = async () => {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT photo FROM flips');
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.execAsync('DELETE FROM flips; DELETE FROM templates; DELETE FROM materials;');
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
  rows.forEach((row) => deletePhoto(row.photo));
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

/** Local calendar date in YYYY-MM-DD form (avoids UTC shifting near midnight). */
export const toLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Days between purchase and sale, or null if either date is missing/invalid/negative. */
export const calcDaysToSell = (flip) => {
  if (!flip.dateBought || !flip.dateSold) return null;
  const bought = new Date(flip.dateBought);
  const sold = new Date(flip.dateSold);
  if (isNaN(bought) || isNaN(sold)) return null;
  const days = Math.round((sold - bought) / 86400000);
  return days >= 0 ? days : null;
};
