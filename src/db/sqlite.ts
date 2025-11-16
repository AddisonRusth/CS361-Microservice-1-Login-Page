import path from "path";
import Database from "better-sqlite3";

const DB_PATH = path.resolve(
    "/nfs/stak/users/rustha/Classes/CS361 Software Engineering/auth-service/auth.db"
);

const db = new Database(DB_PATH);

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
`).run();

export default db;
