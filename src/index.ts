import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(bodyParser.json());

const allowedOrigin =
	process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173";

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
	res.setHeader(
		"Access-Control-Allow-Methods",
		"OPTIONS, GET, POST, PUT, PATCH, DELETE",
	);
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, X-CSRF-Token",
	);
	res.setHeader("Access-Control-Allow-Credentials", "true");

	if (req.method === "OPTIONS") {
		return res.sendStatus(200);
	}

	next();
});

app.use("/auth", authRoutes);

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use(
	(
		error: any,
		_req: express.Request,
		res: express.Response,
		_next: express.NextFunction,
	) => {
		const status =
			typeof error?.statusCode === "number" ? error.statusCode : 500;
		const isHandledClientError = status >= 400 && status < 500;
		const isProduction = process.env.NODE_ENV === "production";

		const responseBody: {
			message: string;
			data?: unknown;
			debugMessage?: string;
		} = {
			message: isHandledClientError
				? error?.message || "Request failed"
				: "Internal server error",
		};

		if (isHandledClientError && error?.data !== undefined) {
			responseBody.data = error.data;
		}

		if (!isProduction && !isHandledClientError && error?.message) {
			responseBody.debugMessage = error.message;
		}

		res.status(status).json(responseBody);
	},
);

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

console.log("Connecting to MongoDB...", MONGODB_URI);
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