import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const MONGODB_URI = `${process.env.MONGODB_TYPE}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER_DOMAIN}:${process.env.MONGODB_PORT}/home-inventory?authSource=admin`;

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

if (!MONGODB_URI.includes("undefined")) {
	mongoose
		.connect(MONGODB_URI)
		.then(() => {
			console.log(`Server running on port ${port}`);
			app.listen(port);
		})
		.catch((err) => {
			console.log(err);
		});
} else {
	console.error(
		"MongoDB connection string is invalid. Check MONGO_URI or MONGODB_* environment variables.",
	);
}
