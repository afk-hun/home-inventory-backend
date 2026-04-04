import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { CSRF_MAX_AGE_MS } from "./csrf";
import { db } from "../lib/db";
import { users, households, householdMembers } from "../db/schema";

const ACCESS_TOKEN_COOKIE_NAME = "auth_token";
const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const USER_ID_COOKIE_NAME = "user_id";
const HOUSEHOLD_ID_COOKIE_NAME = "household_id";
const ACCESS_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type AuthTokenPayload = {
	email: string;
	userId: string;
	type: "access" | "refresh";
};

const getJwtSecret = (): string => {
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT secret is not configured");
	}

	return process.env.JWT_SECRET;
};

export const signAndSetAccessToken = (res: Response, email: string, userId: string) => {
	const token = signAccessToken({ email, userId });
	setAccessTokenCookie(res, token);
};

const signAccessToken = (payload: Omit<AuthTokenPayload, "type">): string => {
	return jwt.sign(
		{
			...payload,
			type: "access",
		},
		getJwtSecret(),
		{ expiresIn: "24h" },
	);
};

const signRefreshToken = (payload: Omit<AuthTokenPayload, "type">): string => {
	return jwt.sign(
		{
			...payload,
			type: "refresh",
		},
		getJwtSecret(),
		{ expiresIn: "7d" },
	);
};

const setAccessTokenCookie = (res: Response, token: string) => {
	res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: ACCESS_TOKEN_MAX_AGE_MS,
		path: "/",
	});
};

const setRefreshTokenCookie = (res: Response, token: string) => {
	res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: REFRESH_TOKEN_MAX_AGE_MS,
		path: "/",
	});
};

const setUserCookie = (res: Response, userId: string) => {
	res.cookie(USER_ID_COOKIE_NAME, userId, {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: CSRF_MAX_AGE_MS,
	});
};

export const setHouseholdCookie = (res: Response, householdId: string) => {
	res.cookie(HOUSEHOLD_ID_COOKIE_NAME, householdId, {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: CSRF_MAX_AGE_MS,
	});
};

const clearAuthCookies = (res: Response) => {
	res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});

	res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});

	res.clearCookie(USER_ID_COOKIE_NAME, {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});
};

const clearCsrfCookies = (res: Response) => {
	res.clearCookie("csrf_session", {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});

	res.clearCookie("XSRF-TOKEN", {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});
};

class CustomError extends Error {
	statusCode: number;
	data: any;

	constructor(message: string) {
		super(message);
		this.statusCode = 500;
		this.data = null;
	}
}

export const signup = (req: Request, res: Response, next: NextFunction) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const error = new CustomError(
			errors
				.array()
				.map((err) => err.msg)
				.join(", ") || "Validation failed",
		);
		error.statusCode = 422;
		error.data = errors.array();
		return next(error);
	}

	const email = req.body.email;
	const name = req.body.name;
	const password = req.body.password;

	bcrypt
		.hash(password, 12)
		.then((hashedPassword) => {
			try {
				const id = createId();
				db.insert(users).values({ id, email, name, password: hashedPassword }).run();
				res.status(201).json({ message: "User created!", userId: id });
			} catch (err: any) {
				if (
					err?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
					err?.message?.includes("UNIQUE constraint failed")
				) {
					const error = new CustomError("E-mail address already exists!");
					error.statusCode = 422;
					throw error;
				}
				throw err;
			}
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const login = (req: Request, res: Response, next: NextFunction) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const error = new CustomError(
			errors
				.array()
				.map((err) => err.msg)
				.join(", ") || "Validation failed",
		);
		error.statusCode = 422;
		error.data = errors.array();
		return next(error);
	}

	const email = req.body.email;
	const password = req.body.password;

	try {
		const user = db.query.users.findFirst({ where: (t, { eq }) => eq(t.email, email) }).sync();
		if (!user) {
			const error = new CustomError("Email or password is incorrect.");
			error.statusCode = 401;
			return next(error);
		}

		bcrypt
			.compare(password, user.password)
			.then((isEqual) => {
				if (!isEqual) {
					const error = new CustomError("Email or password is incorrect.");
					error.statusCode = 401;
					return next(error);
				}

				const basePayload = { email: user.email, userId: user.id };
				const accessToken = signAccessToken(basePayload);
				const refreshToken = signRefreshToken(basePayload);
				setAccessTokenCookie(res, accessToken);
				setRefreshTokenCookie(res, refreshToken);
				setUserCookie(res, user.id);

				const household = db.query.households.findFirst({
					where: (t, { eq }) => eq(t.ownerId, user.id),
				}).sync();
				if (household) {
					setHouseholdCookie(res, household.id);
				}

				res.status(200).json({ message: "Logged in successfully." });
			})
			.catch((err: any) => {
				if (!err.statusCode) err.statusCode = 500;
				next(err);
			});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const refreshToken = (req: Request, res: Response) => {
	const refreshTokenFromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

	if (!refreshTokenFromCookie || typeof refreshTokenFromCookie !== "string") {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const decoded = jwt.verify(refreshTokenFromCookie, getJwtSecret());
		if (typeof decoded === "string") {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const payload = decoded as jwt.JwtPayload;
		if (
			payload.type !== "refresh" ||
			typeof payload.userId !== "string" ||
			typeof payload.email !== "string"
		) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const basePayload = {
			email: payload.email,
			userId: payload.userId,
		};
		const newAccessToken = signAccessToken(basePayload);
		const newRefreshToken = signRefreshToken(basePayload);

		setAccessTokenCookie(res, newAccessToken);
		setRefreshTokenCookie(res, newRefreshToken);

		return res.status(200).json({ message: "Token refreshed." });
	} catch {
		return res.status(401).json({ message: "Unauthorized" });
	}
};

export const logout = (_req: Request, res: Response) => {
	clearAuthCookies(res);
	clearCsrfCookies(res);
	res.status(200).json({ message: "Logged out successfully." });
};
