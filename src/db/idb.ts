// Hand-rolled IndexedDB wrapper. Deliberately tiny — avoids pulling in Dexie
// or any other heavy dependency per the umbrella plan's "minimize deps" rule.
// Each tab opens its own DB (flux-db, vibe-db, balance-db); the wrapper
// promisifies the request-based IDB API and exposes get/put/delete/getAll.

export interface IDBStoreSpec {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
}

export interface IDBConfig {
  name: string;
  version: number;
  stores: IDBStoreSpec[];
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function openDb(config: IDBConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(config.name, config.version);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const spec of config.stores) {
        if (!db.objectStoreNames.contains(spec.name)) {
          db.createObjectStore(spec.name, {
            keyPath: spec.keyPath,
            autoIncrement: spec.autoIncrement,
          });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  const tx = db.transaction(store, 'readonly');
  return promisify<T | undefined>(tx.objectStore(store).get(key));
}

export async function dbPut(
  db: IDBDatabase,
  store: string,
  value: unknown,
  key?: IDBValidKey,
): Promise<IDBValidKey> {
  const tx = db.transaction(store, 'readwrite');
  const result = await promisify(tx.objectStore(store).put(value, key));
  await txDone(tx);
  return result;
}

export async function dbDelete(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<void> {
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).delete(key));
  await txDone(tx);
}

export async function dbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  const tx = db.transaction(store, 'readonly');
  return promisify<T[]>(tx.objectStore(store).getAll());
}

export async function dbClear(db: IDBDatabase, store: string): Promise<void> {
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).clear());
  await txDone(tx);
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
