import { NextFunction, Request, Response } from "express";
import {
	CSRF_COOKIE_NAME,
	CSRF_SESSION_COOKIE_NAME,
} from "../constants/csrf";
import {
	createCsrfSessionId,
	createCsrfToken,
} from "../lib/csrf";

export const CSRF_MAX_AGE_MS = 60 * 60 * 1000; 

export const setCsrfCookie = (res: Response, token: string) => {
	res.cookie(CSRF_COOKIE_NAME, token, {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: CSRF_MAX_AGE_MS,
		path: "/",
	});
};

export const setCsrfSessionCookie = (res: Response, sessionId: string) => {
	res.cookie(CSRF_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: CSRF_MAX_AGE_MS,
		path: "/",
	});
};

export const csrfToken = (req: Request, res: Response) => {
	const currentSessionId = req.cookies?.[CSRF_SESSION_COOKIE_NAME];
	const sessionId =
		typeof currentSessionId === "string" && currentSessionId.length > 0
			? currentSessionId
			: createCsrfSessionId();
	const token = createCsrfToken(sessionId, process.env.JWT_SECRET!);
	setCsrfSessionCookie(res, sessionId);
	setCsrfCookie(res, token);
	res.status(200).json({ csrfToken: token });
};