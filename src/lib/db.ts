/**
 * Persistence layer.
 *
 * Everything lives in IndexedDB: settings in a small key/value store, and one
 * record per conversation so a write only touches the chat that changed.
 * IndexedDB is used instead of localStorage because image attachments are far
 * too big for localStorage's ~5 MB budget.
 */
import { DEFAULT_SETTINGS, type Conversation, type Settings, type StoreData } from "../types";

const DB_NAME = "chatternel";
const DB_VERSION = 1;
const META = "meta";
const CONVOS = "conversations";
const SETTINGS_KEY = "settings";

/** Where versions up to 2.0 kept everything. Read once, then left alone as a backup. */
const LEGACY_KEY = "chatternel";
const MIGRATED_KEY = "chatternel:migrated";

export interface PersistedData {
  settings: Settings;
  conversations: Conversation[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser has no IndexedDB."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(CONVOS)) db.createObjectStore(CONVOS, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab is upgrading: close so it isn't blocked, and reopen on demand.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open the database."));
    request.onblocked = () => reject(new Error("Another tab is holding an older version open."));
  });
  return dbPromise;
}

/** Runs `work` in one transaction and resolves once the whole transaction commits. */
function transact<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let handle: T;
    try {
      handle = work(tx);
    } catch (err) {
      tx.abort();
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(handle);
    tx.onerror = () => reject(tx.error ?? new Error("The write failed."));
    tx.onabort = () => reject(tx.error ?? new Error("The write was aborted."));
  });
}

/** Serialises writes so two rapid changes can never land out of order. */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}

function migrateFromLocalStorage(): PersistedData | null {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return null;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      conversations: Array.isArray(data.conversations) ? data.conversations : [],
    };
  } catch {
    return null;
  }
}

function markMigrated(): void {
  try {
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString());
  } catch {
    // Nothing to do — worst case the (idempotent) migration is retried.
  }
}

export async function loadAll(): Promise<PersistedData> {
  const db = await openDb();
  const [settingsReq, convosReq] = await transact(db, [META, CONVOS], "readonly", (tx) => [
    tx.objectStore(META).get(SETTINGS_KEY) as IDBRequest<Settings | undefined>,
    tx.objectStore(CONVOS).getAll() as IDBRequest<Conversation[]>,
  ]);

  const stored = settingsReq.result;
  const conversations = (convosReq.result ?? []).sort((a, b) => a.createdAt - b.createdAt);

  if (!stored && conversations.length === 0) {
    const legacy = migrateFromLocalStorage();
    if (legacy) {
      await writeAll(legacy);
      markMigrated();
      return legacy;
    }
  }

  return { settings: { ...DEFAULT_SETTINGS, ...stored }, conversations };
}

function writeAll(data: PersistedData): Promise<void> {
  return enqueue(async () => {
    const db = await openDb();
    await transact(db, [META, CONVOS], "readwrite", (tx) => {
      tx.objectStore(META).put(data.settings, SETTINGS_KEY);
      const store = tx.objectStore(CONVOS);
      for (const convo of data.conversations) store.put(convo);
    });
  });
}

/**
 * Writes only what actually changed. State is updated immutably, so an
 * unchanged conversation is still the very same object and can be skipped.
 */
export function writeChanges(next: StoreData, prev: StoreData): Promise<void> {
  const settingsChanged = next.settings !== prev.settings;
  const before = new Map(prev.conversations.map((c) => [c.id, c]));
  const changed = next.conversations.filter((c) => before.get(c.id) !== c);
  const nextIds = new Set(next.conversations.map((c) => c.id));
  const removed = prev.conversations.filter((c) => !nextIds.has(c.id)).map((c) => c.id);

  if (!settingsChanged && changed.length === 0 && removed.length === 0) return Promise.resolve();

  return enqueue(async () => {
    const db = await openDb();
    await transact(db, [META, CONVOS], "readwrite", (tx) => {
      if (settingsChanged) tx.objectStore(META).put(next.settings, SETTINGS_KEY);
      const store = tx.objectStore(CONVOS);
      for (const convo of changed) store.put(convo);
      for (const id of removed) store.delete(id);
    });
  });
}
