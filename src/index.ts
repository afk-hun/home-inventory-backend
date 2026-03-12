import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI || typeof MONGODB_URI !== "string") {
	console.error(
		"MongoDB connection string is invalid. Check MONGO_URI or MONGODB_* environment variables.",
	);
	process.exit(1);
}

if (!JWT_SECRET || typeof JWT_SECRET !== "string") {
	console.error(
		"JWT_SECRET is not configured. Please set JWT_SECRET environment variable.",
	);
	process.exit(1);
}

mongoose
	.connect(MONGODB_URI)
	.then(() => {
		console.log(`Server running on port ${port}`);
		app.listen(port);
	})
	.catch((err) => {
		console.error("MongoDB connection error:", err);
		process.exit(1);
	});
