import { Router } from "express";
import { body } from "express-validator";
import { db } from "../lib/db";
import { signup, login, logout, refreshToken } from "../controller/auth";
import { validateCsrf } from "../middleware/csrf";
import { loginLimiter, signupLimiter } from "../middleware/rateLimiter";
import { csrfToken } from "../controller/csrf";

const router = Router();

router.get("/csrf-token", csrfToken);

router.post(
	"/signup",
	signupLimiter,
	validateCsrf,
	[
		body("email")
			.isEmail()
			.withMessage("Please enter a valid email.")
			.custom((value) => {
				const existing = db.query.users.findFirst({ where: (t, { eq }) => eq(t.email, value) }).sync();
				if (existing) {
					throw new Error("E-Mail address already exists!");
				}
				return true;
			})
			.normalizeEmail(),
		body("password").trim().isLength({ min: 6 }),
		body("name").trim().not().isEmpty(),
	],
	signup,
);

router.post(
	"/login",
	loginLimiter,
	validateCsrf,
	[
		body("email")
			.isEmail()
			.withMessage("Please enter a valid email.")
			.normalizeEmail(),
		body("password")
			.exists()
			.withMessage("Password is required.")
			.bail()
			.isLength({ min: 6 })
			.withMessage("Password must be at least 6 characters long."), 
	],
	login,
);

router.post("/refresh", loginLimiter, validateCsrf, refreshToken);  

router.post("/logout", validateCsrf, logout);

export default router;
