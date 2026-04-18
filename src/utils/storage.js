import AsyncStorage from '@react-native-async-storage/async-storage';

const FLIPS_KEY = '@flip_tracker_flips';

export const loadFlips = async () => {
  try {
    const json = await AsyncStorage.getItem(FLIPS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load flips:', e);
    return [];
  }
};

export const saveFlips = async (flips) => {
  try {
    await AsyncStorage.setItem(FLIPS_KEY, JSON.stringify(flips));
  } catch (e) {
    console.error('Failed to save flips:', e);
  }
};

export const addFlip = async (flip) => {
  const flips = await loadFlips();
  const newFlip = {
    ...flip,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  const updated = [newFlip, ...flips];
  await saveFlips(updated);
  return updated;
};

export const updateFlip = async (id, updates) => {
  const flips = await loadFlips();
  const updated = flips.map((f) => (f.id === id ? { ...f, ...updates } : f));
  await saveFlips(updated);
  return updated;
};

export const deleteFlip = async (id) => {
  const flips = await loadFlips();
  const updated = flips.filter((f) => f.id !== id);
  await saveFlips(updated);
  return updated;
};

const GOAL_KEY = '@flip_tracker_goal';

export const loadGoal = async () => {
  try {
    const val = await AsyncStorage.getItem(GOAL_KEY);
    return val ? parseFloat(val) : 0;
  } catch { return 0; }
};

export const saveGoal = async (goal) => {
  try {
    await AsyncStorage.setItem(GOAL_KEY, String(goal));
  } catch {}
};

export const calcProfit = (flip) => {
  const sell = parseFloat(flip.sellPrice) || 0;
  const buy = parseFloat(flip.buyPrice) || 0;
  const fees = parseFloat(flip.fees) || 0;
  return sell - buy - fees;
};
