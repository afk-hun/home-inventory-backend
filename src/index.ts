import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || typeof JWT_SECRET !== "string") {
	console.error(
		"JWT_SECRET is not configured. Please set JWT_SECRET environment variable.",
	);
	process.exit(1);
}

console.log(`Server running on port ${port}`);
app.listen(port);
