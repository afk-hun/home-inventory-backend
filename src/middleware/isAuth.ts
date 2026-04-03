import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { signAndSetAccessToken } from "../controller/auth";

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

	prisma.user
		.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true },
		})
		.then((user) => {
			if (!user) {
				res.status(401).json({ message: "Unauthorized" });
				return;
			}
			req.user = user;
			req.householdId = req.cookies?.household_id;
			signAndSetAccessToken(res, user.email, user.id);
			next();
		})
		.catch(() => {
			res.status(401).json({ message: "Unauthorized" });
		});
};
