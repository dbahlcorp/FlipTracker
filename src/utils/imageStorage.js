import { Directory, File, Paths } from 'expo-file-system';

const PHOTOS_DIR = new Directory(Paths.document, 'flip-photos');

function ensureDir() {
  if (!PHOTOS_DIR.exists) PHOTOS_DIR.create({ intermediates: true });
}

function randomName(ext) {
  return `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
}

/** Copies a photo picked via expo-image-picker into permanent app storage and returns its file:// uri. */
export function savePickedPhoto(pickerUri) {
  ensureDir();
  const ext = (pickerUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
  const dest = new File(PHOTOS_DIR, randomName(ext));
  new File(pickerUri).copy(dest);
  return dest.uri;
}

/** One-time migration helper: writes a legacy base64 data-uri photo to disk and returns its file:// uri. */
export function saveBase64Photo(dataUri) {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUri || '');
  if (!match) return null;
  ensureDir();
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const file = new File(PHOTOS_DIR, randomName(ext));
  file.create();
  file.write(match[2], { encoding: 'base64' });
  return file.uri;
}

/** Deletes a photo previously saved by this module. Safe to call with empty/legacy/missing values. */
export function deletePhoto(uri) {
  if (!uri || !uri.startsWith('file://')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    // Best-effort cleanup; a missing or locked file shouldn't block the caller.
  }
}
