import { CachedDocument } from '../types';

const DB_NAME = 'jobing_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this browser.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Saves or updates a document in local IndexedDB cache
 */
export async function saveDocumentToCache(doc: {
  slug: string;
  id?: string;
  content: string;
  contentLength: number;
  createdAt: string;
  updatedAt?: string;
}): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: CachedDocument = {
        ...doc,
        slug: doc.slug.toLowerCase().trim(),
        cachedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to cache document to IndexedDB:', err);
  }
}

/**
 * Retrieves a document from IndexedDB by slug
 */
export async function getDocumentFromCache(slug: string): Promise<CachedDocument | null> {
  try {
    const db = await openDB();
    const normalized = slug.toLowerCase().trim();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(normalized);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve from IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves all cached documents for offline browsing
 */
export async function getAllCachedDocuments(): Promise<CachedDocument[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: CachedDocument[] = req.result || [];
        // sort by newest cachedAt
        results.sort((a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get all cached documents:', err);
    return [];
  }
}

/**
 * Deletes a cached document
 */
export async function deleteDocumentFromCache(slug: string): Promise<void> {
  try {
    const db = await openDB();
    const normalized = slug.toLowerCase().trim();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(normalized);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete from IndexedDB:', err);
  }
}

/**
 * Clears entire cache
 */
export async function clearAllCachedDocuments(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
}
