import { Router } from "express";
import { body } from "express-validator";
import User from "../models/user";
import { signup, login } from "../controller/auth";

const router = Router();

router.post(
	"/signup",
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
	[
		body("email")
			.isEmail()
			.withMessage("Please enter a valid email.")
			.normalizeEmail(),
		body("password")
			.exists()
			.withMessage("Password is required.")
			.bail()
			.isLength({ min: 1 }),
	],
	login,
);

export default router;
