import { NextFunction, Request, Response } from "express";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "x-csrf-token";

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
	if (!cookieHeader) {
		return {};
	}

	return cookieHeader
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.reduce<Record<string, string>>((cookies, cookiePart) => {
			const [rawName, ...rawValue] = cookiePart.split("=");
			if (!rawName || rawValue.length === 0) {
				return cookies;
			}

			cookies[rawName] = decodeURIComponent(rawValue.join("="));
			return cookies;
		}, {});
};

export const validateCsrf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const cookies = parseCookieHeader(req.headers.cookie);
	const csrfCookie = cookies[CSRF_COOKIE_NAME];
	const csrfHeader = req.headers[CSRF_HEADER_NAME];
	const csrfToken = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

	if (!csrfCookie || !csrfToken || csrfCookie !== csrfToken) {
		return res.status(403).json({
			message: "Invalid CSRF token.",
		});
	}

	next();
};
