import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

const DEFAULT_DB = {
  version: 1,
  createdAt: new Date().toISOString(),
  profiles: [],
  films: [],
  interactions: {},
};

// Simple write queue to prevent concurrent write corruption
let writeQueue = Promise.resolve();

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function read() {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return structuredClone(DEFAULT_DB);
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

export function write(data) {
  writeQueue = writeQueue.then(() => {
    ensureDir();
    const tmp = DB_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DB_PATH);
  });
  return writeQueue;
}

export function update(fn) {
  const db = read();
  fn(db);
  return write(db);
}

export function getDbPath() {
  return DB_PATH;
}
