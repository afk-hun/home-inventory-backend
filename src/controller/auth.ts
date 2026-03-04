import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import User, { IUser } from "../models/user";
import jwt from "jsonwebtoken";
import { CSRF_MAX_AGE_MS } from "./csrf";

const ACCESS_TOKEN_COOKIE_NAME = "auth_token";
const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const USER_ID_COOKIE_NAME = "user_id";
const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
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

const signAccessToken = (payload: Omit<AuthTokenPayload, "type">): string => {
	return jwt.sign(
		{
			...payload,
			type: "access",
		},
		getJwtSecret(),
		{ expiresIn: "1h" },
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
			const user = new User({
				email: email,
				name: name,
				password: hashedPassword,
			});
			return user.save();
		})
		.then((result) => {
			res.status(201).json({
				message: "User created!",
				userId: result._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
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

	let loadedUser: IUser;
	User.findOne({ email: email })
		.then((user) => {
			if (!user) {
				const error = new CustomError(
					"Email or password is incorrect.",
				);
				error.statusCode = 401;
				throw error;
			}
			loadedUser = user;
			return bcrypt.compare(password, user.password);
		})
		.then((isEqual) => {
			if (!isEqual) {
				const error = new CustomError("Email or password is incorrect.");
				error.statusCode = 401;
				throw error;
			}
			const basePayload = {
				email: loadedUser.email,
				userId: loadedUser._id.toString(),
			};
			const accessToken = signAccessToken(basePayload);
			const refreshToken = signRefreshToken(basePayload);
			setAccessTokenCookie(res, accessToken);
			setRefreshTokenCookie(res, refreshToken);
			setUserCookie(res, loadedUser._id.toString());
			res.status(200).json({
				message: "Logged in successfully.",
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
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
