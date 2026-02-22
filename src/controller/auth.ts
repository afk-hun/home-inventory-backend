import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import User from "../models/user";
import jwt from "jsonwebtoken";

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
	const email = req.body.email;
	const password = req.body.password;

	let loadedUser: any;
	User.findOne({ email: email })
		.then((user) => {
			if (!user) {
				const error = new CustomError(
					"A user with this email could not be found.",
				);
				error.statusCode = 401;
				throw error;
			}
			loadedUser = user;
			return bcrypt.compare(password, user.password);
		})
		.then((isEqual) => {
			if (!isEqual) {
				const error = new CustomError("Wrong password!");
				error.statusCode = 401;
				throw error;
			}
			if (process.env.JWT_SECRET === undefined) {
				const error = new CustomError("JWT secret is not configured.");
				error.statusCode = 500;
				return next(error);
			}
			const token = jwt.sign(
				{
					email: loadedUser.email,
					userId: loadedUser._id.toString(),
				},
				process.env.JWT_SECRET,
				{ expiresIn: "1h" },
			);
			res.status(200).json({
				token: token,
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
