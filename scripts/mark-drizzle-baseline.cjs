require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const migrationsDir = path.resolve(__dirname, "..", "drizzle");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");

if (!fs.existsSync(journalPath)) {
	console.error("Missing drizzle/meta/_journal.json. Generate the baseline first.");
	process.exit(1);
}

const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const firstEntry = journal.entries?.[0];

if (!firstEntry) {
	console.error("No drizzle migrations found to mark as baseline.");
	process.exit(1);
}

const sqlPath = path.join(migrationsDir, `${firstEntry.tag}.sql`);

if (!fs.existsSync(sqlPath)) {
	console.error(`Missing baseline SQL file: ${firstEntry.tag}.sql`);
	process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, "utf8");
const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

const databaseUrl = process.env.DATABASE_URL || "file:./database.db";
const dbPath = databaseUrl.replace(/^file:/, "");
const db = new Database(path.resolve(__dirname, "..", dbPath));

db.exec(`
	CREATE TABLE IF NOT EXISTS __drizzle_migrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hash text NOT NULL,
		created_at numeric
	)
`);

const exists = db
	.prepare("SELECT 1 FROM __drizzle_migrations WHERE created_at = ? LIMIT 1")
	.get(firstEntry.when);

if (exists) {
	console.log(`Baseline already marked: ${firstEntry.tag}`);
	db.close();
	process.exit(0);
}

db.prepare(
	"INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
).run(hash, firstEntry.when);

console.log(`Marked baseline as applied: ${firstEntry.tag}`);
db.close();