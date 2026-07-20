// StorageEngine — IndexedDB persistence for Natraj Passport Photo Studio
// Storage Engine
//
// Architecture (SOLID compliant):
//   - Single class with one responsibility: read/write to IndexedDB
//   - All methods return Promises — no callbacks exposed externally
//   - Zero dependency on React or Zustand — pure vanilla JS class
//   - Open-Closed: new stores can be added without modifying existing logic

import type { StoredProject } from '@/types';

// Constants

const DB_NAME = 'natraj-studio-db';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  PREFERENCES: 'preferences',
} as const;

// StorageEngine Class

class StorageEngine {
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;


  /**
   * Open (or re-use) the IndexedDB connection.
   * Only one open() call is made regardless of concurrent callers.
   */
  open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createSchema(db);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;

        // Handle unexpected close (e.g., user deleted the database externally)
        this.db.onclose = () => {
          this.db = null;
          this.openPromise = null;
        };

        resolve(this.db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(new Error(`[StorageEngine] Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onblocked = () => {
        console.warn('[StorageEngine] Database upgrade blocked by another open tab.');
      };
    });

    return this.openPromise;
  }


  private createSchema(db: IDBDatabase): void {
    // Projects store
    if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
      const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    // Preferences store (single record keyed by 'user')
    if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
      db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
    }
  }


  async saveProject(project: StoredProject): Promise<void> {
    const db = await this.open();
    return this.runTransaction(db, STORES.PROJECTS, 'readwrite', (store) => {
      store.put(project);
    });
  }

  async getProject(id: string): Promise<StoredProject | null> {
    const db = await this.open();
    return this.runRequest<StoredProject | undefined>(
      db,
      STORES.PROJECTS,
      'readonly',
      (store) => store.get(id) as unknown as IDBRequest<StoredProject | undefined>
    ).then((result) => result ?? null);
  }

  async getAllProjects(): Promise<StoredProject[]> {
    const db = await this.open();
    return this.runRequest<StoredProject[]>(
      db,
      STORES.PROJECTS,
      'readonly',
      (store) => store.index('updatedAt').getAll() as unknown as IDBRequest<StoredProject[]>
    ).then((results) =>
      // Sort descending by updatedAt (most recent first)
      (results ?? []).sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.open();
    return this.runTransaction(db, STORES.PROJECTS, 'readwrite', (store) => {
      store.delete(id);
    });
  }

  async deleteAllProjects(): Promise<void> {
    const db = await this.open();
    return this.runTransaction(db, STORES.PROJECTS, 'readwrite', (store) => {
      store.clear();
    });
  }


  async savePreference<T>(key: string, value: T): Promise<void> {
    const db = await this.open();
    return this.runTransaction(db, STORES.PREFERENCES, 'readwrite', (store) => {
      store.put({ key, value });
    });
  }

  async getPreference<T>(key: string): Promise<T | null> {
    const db = await this.open();
    const result = await this.runRequest<{ key: string; value: T } | undefined>(
      db,
      STORES.PREFERENCES,
      'readonly',
      (store) => store.get(key) as IDBRequest<{ key: string; value: T } | undefined>
    );
    return result?.value ?? null;
  }


  /**
   * Run a write transaction (put/delete/clear) and resolve when complete.
   */
  private runTransaction(
    db: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      operation(store);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`[StorageEngine] Transaction failed: ${tx.error?.message}`));
      tx.onabort = () => reject(new Error('[StorageEngine] Transaction aborted'));
    });
  }

  /**
   * Run a read request and resolve with the result.
   */
  private runRequest<T>(
    db: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`[StorageEngine] Read failed: ${request.error?.message}`));
    });
  }


  close(): void {
    this.db?.close();
    this.db = null;
    this.openPromise = null;
  }
}

// Singleton — one engine per app session
export const storageEngine = new StorageEngine();
