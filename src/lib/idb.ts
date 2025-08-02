
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MyDB extends DBSchema {
  'keyval': {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>>;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<MyDB>('lightaudio-db', 1, {
            upgrade(db) {
                db.createObjectStore('keyval');
            },
        });
    }
    return dbPromise;
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('keyval', key);
}

export async function set(key: string, val: any): Promise<void> {
  const db = await getDB();
  await db.put('keyval', val, key);
}

export async function del(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('keyval', key);
}
