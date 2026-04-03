import { execSync } from "child_process";
import path from "path";

export function setup() {
	const TEST_DB_PATH = path.resolve(__dirname, "../../test.db");
	execSync("npx prisma db push --accept-data-loss", {
		env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
		stdio: "inherit",
	});
}
