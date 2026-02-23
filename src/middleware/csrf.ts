import { NextFunction, Request, Response } from "express";
import { CSRF_HEADER_NAME, CSRF_SESSION_COOKIE_NAME } from "../constants/csrf";
import {
	createCsrfToken,
	isCsrfTokenValid,
} from "../lib/csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const validateCsrf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	if (SAFE_METHODS.has(req.method)) {
		next();
		return;
	}

	const csrfSessionId = req.cookies?.[CSRF_SESSION_COOKIE_NAME];
	const csrfHeader = req.headers[CSRF_HEADER_NAME];
	const providedCsrfToken =
		Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

	if (!csrfSessionId || !providedCsrfToken) {
		return res.status(403).json({
			message: "Invalid CSRF token.",
		});
	}

	const expectedCsrfToken = createCsrfToken(
		csrfSessionId,
		process.env.JWT_SECRET!,
	);

	if (!isCsrfTokenValid(expectedCsrfToken, providedCsrfToken)) {
		return res.status(403).json({
			message: "Invalid CSRF token.",
		});
	}

	next();
};
