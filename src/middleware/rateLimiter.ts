import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 requests per windowMs
	message: {
		message:
			"Too many login attempts from this IP, please try again after 15 minutes.",
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	skipSuccessfulRequests: false, // Count successful requests
});

export const signupLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Limit each IP to 3 signup requests per hour
	message: {
		message:
			"Too many accounts created from this IP, please try again after an hour.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});
