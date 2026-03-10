import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";
import Household from "../models/household";

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
	const token = req.cookies?.auth_token;

	if (!token || typeof token !== "string") {
		return res.status(401).json({ message: "Unauthorized" });
	}

	let decodedToken: jwt.JwtPayload;
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET!);
		if (typeof decoded === "string") {
			return res.status(401).json({ message: "Unauthorized" });
		}
		decodedToken = decoded;
	} catch {
		return res.status(401).json({ message: "Unauthorized" });
	}

	if (decodedToken.type !== "access") {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const userId = decodedToken.userId;
	if (!userId || typeof userId !== "string") {
		return res.status(401).json({ message: "Unauthorized" });
	}

	User.findById(userId)
		.select("-password")
		.then((user) => {
			if (!user) {
				res.status(401).json({ message: "Unauthorized" });
				return;
			}
			req.user = user;

			return Household.findOne({ "owner._id": user._id });
		})
		.then((household) => {
			if (household) {
				req.householdId = household._id.toString();
			} else {
				req.householdId = undefined;
			}
			next();
		})
		.catch(() => {
			res.status(401).json({ message: "Unauthorized" });
		});
};
