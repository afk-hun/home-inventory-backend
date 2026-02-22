import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import User from "../models/user";

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
		const error = new CustomError(errors.array().map(err => err.msg).join(", ") || "Validation failed");
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
