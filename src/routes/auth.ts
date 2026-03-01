import { Router } from "express";
import { body } from "express-validator";
import User from "../models/user";
import { signup, login, logout } from "../controller/auth";
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
			.custom((value, { req }) => {
				return User.findOne({ email: value }).then((userDoc) => {
					if (userDoc) {
						return Promise.reject("E-Mail address already exists!");
					}
				});
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

router.post("/logout", validateCsrf, logout);

export default router;
