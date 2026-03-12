import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import householdRoutes from "./routes/household";
import shelf from "./routes/shelf";
import unitRoutes from "./routes/unit";

const app = express();

const rawTrustProxy = process.env.TRUST_PROXY;
const trustProxyValue =
	rawTrustProxy === undefined
		? false
		: rawTrustProxy === "true"
			? true
			: rawTrustProxy === "false"
				? false
				: /^\d+$/.test(rawTrustProxy)
					? Number(rawTrustProxy)
					: rawTrustProxy;

app.set("trust proxy", trustProxyValue);

app.use(bodyParser.json());
app.use(cookieParser());

const rawCorsOrigin =
	process.env.CORS_ORIGIN ||
	process.env.FRONTEND_URL ||
	"http://localhost:5173";
const allowedOrigins = rawCorsOrigin
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);
const isProductionEnv = process.env.NODE_ENV === "production";
const isWildcardOrigin = allowedOrigins.some(
	(origin) => origin === "*" || origin.includes("*"),
);
if (isProductionEnv && isWildcardOrigin) {
	throw new Error(
		"Invalid CORS configuration: wildcard origins are not allowed in production when credentials are enabled. " +
			"Please set CORS_ORIGIN or FRONTEND_URL to the exact frontend URL.",
	);
}
if (allowedOrigins.length === 0) {
	throw new Error(
		"Invalid CORS configuration: no allowed origin was configured.",
	);
}

app.use((req, res, next) => {
	const requestOrigin = req.headers.origin;
	const hasRequestOrigin =
		typeof requestOrigin === "string" && requestOrigin.trim().length > 0;
	const isOriginAllowed =
		hasRequestOrigin && allowedOrigins.includes(requestOrigin);

	if (hasRequestOrigin && !isOriginAllowed) {
		if (req.method === "OPTIONS") {
			return res.sendStatus(403);
		}

		return res.status(403).json({
			message: "Origin not allowed by CORS policy.",
		});
	}

	if (isOriginAllowed) {
		res.setHeader("Vary", "Origin");
		res.setHeader("Access-Control-Allow-Origin", requestOrigin);
		res.setHeader(
			"Access-Control-Allow-Methods",
			"OPTIONS, GET, POST, PUT, PATCH, DELETE",
		);
		res.setHeader(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-CSRF-Token",
		);
		res.setHeader("Access-Control-Allow-Credentials", "true");
	}

	if (req.method === "OPTIONS") {
		return res.sendStatus(200);
	}

	next();
});

app.use("/auth", authRoutes);
app.use("/household", householdRoutes);
app.use("/shelf", shelf);
app.use("/unit", unitRoutes);

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

export default app;
