import { openDb, dbGet, dbPut, dbPutMany, dbDelete, dbClear, dbGetAll } from '../../db/idb';
import type { LogEntry, LogMap, Program, WorkoutState } from './types';

const DB_NAME = 'flux-db';
// Bumped to 2 to add the 'program' store. New users get it on first open;
// existing users get an automatic onupgradeneeded migration via openDb.
const DB_VERSION = 2;
const STATE_STORE = 'state';
const LOG_STORE = 'log';
const PROGRAM_STORE = 'program';
const STATE_KEY = 'current';
const PROGRAM_KEY = 'current';

const DIFFICULTIES = new Set(['easy', 'good', 'hard', 'failed']);

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb({
      name: DB_NAME,
      version: DB_VERSION,
      stores: [
        { name: STATE_STORE },
        { name: LOG_STORE },
        { name: PROGRAM_STORE },
      ],
    });
  }
  return dbPromise;
}

export const DEFAULT_STATE: WorkoutState = { globalDay: 1, currentPhase: 'p1' };

export async function loadState(): Promise<WorkoutState> {
  const db = await getDb();
  const saved = await dbGet<WorkoutState>(db, STATE_STORE, STATE_KEY);
  if (!saved) return { ...DEFAULT_STATE };
  const day = Number(saved.globalDay);
  return {
    globalDay: Number.isInteger(day) && day >= 1 ? day : 1,
    currentPhase:
      typeof saved.currentPhase === 'string' ? saved.currentPhase : 'p1',
  };
}

export async function saveState(state: WorkoutState): Promise<void> {
  const db = await getDb();
  await dbPut(db, STATE_STORE, state, STATE_KEY);
}

export async function loadLog(): Promise<LogMap> {
  const db = await getDb();
  const tx = db.transaction(LOG_STORE, 'readonly');
  const store = tx.objectStore(LOG_STORE);
  return new Promise((resolve, reject) => {
    const result: LogMap = {};
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        result[String(cursor.key)] = cursor.value as LogEntry;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function putLogEntry(key: string, entry: LogEntry): Promise<void> {
  const db = await getDb();
  await dbPut(db, LOG_STORE, entry, key);
}

export async function putLogEntries(
  entries: Array<{ key: string; entry: LogEntry }>,
): Promise<void> {
  const db = await getDb();
  await dbPutMany(
    db,
    LOG_STORE,
    entries.map(({ key, entry }) => ({ key, value: entry })),
  );
}

export async function deleteLogEntry(key: string): Promise<void> {
  const db = await getDb();
  await dbDelete(db, LOG_STORE, key);
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await dbClear(db, STATE_STORE);
  await dbClear(db, LOG_STORE);
  await dbClear(db, PROGRAM_STORE);
}

export async function loadProgram(): Promise<Program | null> {
  const db = await getDb();
  const saved = await dbGet<Program>(db, PROGRAM_STORE, PROGRAM_KEY);
  return saved ?? null;
}

export async function saveProgram(program: Program): Promise<void> {
  const db = await getDb();
  await dbPut(db, PROGRAM_STORE, program, PROGRAM_KEY);
}

export async function clearProgram(): Promise<void> {
  const db = await getDb();
  await dbDelete(db, PROGRAM_STORE, PROGRAM_KEY);
}

// Returns the parsed list of all log entries in insertion order. Useful for
// debugging and for future analytics; the working interface is loadLog().
export async function listLogValues(): Promise<LogEntry[]> {
  const db = await getDb();
  return dbGetAll<LogEntry>(db, LOG_STORE);
}

export function sanitizeLogEntry(raw: unknown): Partial<LogEntry> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entry = raw as Record<string, unknown>;
  const out: Partial<LogEntry> = {};

  if (typeof entry.exercise === 'string') {
    out.exercise = entry.exercise.slice(0, 200);
  }
  if (typeof entry.weight === 'number' && Number.isFinite(entry.weight)) {
    out.weight = entry.weight;
  } else if (typeof entry.weight === 'string') {
    const parsed = parseFloat(entry.weight);
    if (Number.isFinite(parsed)) out.weight = parsed;
  }
  if (typeof entry.difficulty === 'string' && DIFFICULTIES.has(entry.difficulty)) {
    out.difficulty = entry.difficulty as LogEntry['difficulty'];
  }
  if (typeof entry.notes === 'string') {
    out.notes = entry.notes.slice(0, 500);
  }
  if (typeof entry.completed === 'boolean') {
    out.completed = entry.completed;
  }
  if (typeof entry.day === 'number' && Number.isFinite(entry.day)) {
    out.day = entry.day;
  }
  if (typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)) {
    out.timestamp = entry.timestamp;
  }
  if (typeof entry.failedSet === 'number' && Number.isFinite(entry.failedSet)) {
    out.failedSet = entry.failedSet;
  }
  if (typeof entry.failedRep === 'number' && Number.isFinite(entry.failedRep)) {
    out.failedRep = entry.failedRep;
  }
  return out;
}

// Reset the cached connection — only used by tests that wipe the DB between runs.
export function _resetDbForTests(): void {
  dbPromise = null;
}
