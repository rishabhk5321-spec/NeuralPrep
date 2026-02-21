
import { strToU8, strFromU8, zlibSync, unzlibSync } from 'fflate';
import { AppState } from '../types';

/**
 * Persistence Service
 * Uses IndexedDB for bulk data (Vault) and localStorage for high-speed small data (Profile).
 * Implements Zlib compression to increase storage density by ~400%.
 */

const DB_NAME = 'NeuralPrepVault';
const STORE_NAME = 'vault_chunks';
const VAULT_KEY = 'main_vault_data';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVaultToIndexedDB(state: AppState): Promise<void> {
  const db = await openDB();
  const bulkData = {
    quizzes: state.quizzes,
    flashcards: state.flashcards,
    summaries: state.summaries,
    memory: state.memory
  };

  const jsonString = JSON.stringify(bulkData);
  const dataU8 = strToU8(jsonString);
  const compressed = zlibSync(dataU8, { level: 9 });

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(compressed, VAULT_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadVaultFromIndexedDB(): Promise<Partial<AppState> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(VAULT_KEY);

    request.onsuccess = () => {
      const compressed = request.result;
      if (!compressed) {
        resolve(null);
        return;
      }

      try {
        const decompressed = unzlibSync(compressed);
        const jsonString = strFromU8(decompressed);
        resolve(JSON.parse(jsonString));
      } catch (e) {
        console.error("Vault decompression failed:", e);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export function saveProfileToLocalStorage(state: AppState) {
  const fastData = {
    user: state.user,
    theme: state.theme,
    devMode: state.devMode
  };
  localStorage.setItem('neural_prep_profile', JSON.stringify(fastData));
}

export function loadProfileFromLocalStorage(): Partial<AppState> {
  const saved = localStorage.getItem('neural_prep_profile');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Profile load failed", e);
    }
  }
  return {};
}
