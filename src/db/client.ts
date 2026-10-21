import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('yipo.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Run migrations
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM migrations ORDER BY version ASC;'
  );
  const appliedSet = new Set(appliedMigrations.map((m) => m.version));

  for (const migration of MIGRATIONS) {
    if (!appliedSet.has(migration.version)) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.up);
        await db.runAsync(
          'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
    }
  }

  dbInstance = db;
  return dbInstance;
}
