import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_DIR || '/tmp';
const DB_PATH = path.join(DB_DIR, 'questions.sqlite');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

declare global {
  var __db: Database.Database | undefined;
}

function createDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
  `);
  return db;
}

export const db = global.__db ?? createDb();
if (process.env.NODE_ENV !== 'production') global.__db = db;

export type Question = {
  id: number;
  text: string;
  created_at: number;
};

export function insertQuestion(text: string): Question {
  const now = Date.now();
  const result = db
    .prepare('INSERT INTO questions (text, created_at) VALUES (?, ?)')
    .run(text, now);
  return { id: Number(result.lastInsertRowid), text, created_at: now };
}

export function listQuestions(): Question[] {
  return db
    .prepare('SELECT id, text, created_at FROM questions ORDER BY created_at DESC')
    .all() as Question[];
}

export function countQuestions(): number {
  const row = db.prepare('SELECT COUNT(*) as n FROM questions').get() as { n: number };
  return row.n;
}

export function clearQuestions(): void {
  db.prepare('DELETE FROM questions').run();
}
