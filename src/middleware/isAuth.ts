import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";

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
				return res.status(401).json({ message: "Unauthorized" });
			}

			req.user = user;
			next();
		})
		.catch(() => {
			return res.status(401).json({ message: "Unauthorized" });
		});
};