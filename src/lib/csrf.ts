import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const createCsrfSessionId = (): string => {
	return randomBytes(32).toString("hex");
};

export const createCsrfToken = (sessionId: string, secret: string): string => {
	return createHmac("sha256", secret).update(sessionId).digest("hex");
};

export const isCsrfTokenValid = (
	expectedToken: string,
	providedToken: string,
): boolean => {
	const expectedBuffer = Buffer.from(expectedToken, "utf8");
	const providedBuffer = Buffer.from(providedToken, "utf8");

	if (expectedBuffer.length !== providedBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, providedBuffer);
};
