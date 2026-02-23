import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import User, { IUser } from "../models/user";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

class CustomError extends Error {
	statusCode: number;
	data: any;

	constructor(message: string) {
		super(message);
		this.statusCode = 500;
		this.data = null;
	}
}

const CSRF_COOKIE_NAME = "XSRF-TOKEN";

const setCsrfCookie = (res: Response, token: string) => {
	res.cookie(CSRF_COOKIE_NAME, token, {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 2 * 60 * 60 * 1000,
		path: "/",
	});
};

export const csrfToken = (_req: Request, res: Response) => {
	const token = randomBytes(32).toString("hex");
	setCsrfCookie(res, token);
	res.status(200).json({ csrfToken: token });
};

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
			const token = jwt.sign(
				{
					email: loadedUser.email,
					userId: loadedUser._id.toString(),
				},
				process.env.JWT_SECRET!,
				{ expiresIn: "1h" },
			);
			res.cookie("auth_token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 1000,
				path: "/",
			});
			res.status(200).json({
				userId: loadedUser._id.toString(),
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const logout = (_req: Request, res: Response) => {
	res.clearCookie("auth_token", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});

	res.status(200).json({ message: "Logged out successfully." });
};
