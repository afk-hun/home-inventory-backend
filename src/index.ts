import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes  from "./routes/auth";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const MONGODB_URI = `${process.env.MONGODB_TYPE}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER_DOMAIN}:${process.env.MONGODB_PORT}/home-inventory?authSource=admin`;

app.use(bodyParser.json()); 

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader(
		"Access-Control-Allow-Methods",
		"OPTIONS, GET, POST, PUT, PATCH, DELETE",
	);
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	);
	next();
});

app.use("/auth", authRoutes);

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	const status = error.statusCode || 500;
	const message = error.message || "Internal server error";
	const data = error.data;

	res.status(status).json({
		message,
		data,
	});
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
